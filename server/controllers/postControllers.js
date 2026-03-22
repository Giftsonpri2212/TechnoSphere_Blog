const Post = require("../models/postModel");
const User = require("../models/userModel");
const { get } = require("mongoose");
const bcrypt = require("bcryptjs");
const HttpError = require("../models/errorModel");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PostVersion = require("../models/postVersionModel");
const {
  cacheSet,
  cacheGet,
  cacheDeleteByPrefix,
} = require("../utils/cacheClient");

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const SUMMARY_CACHE_TTL_MS =
  (Number(process.env.SUMMARY_CACHE_TTL_SECONDS) || 3600) * 1000;
const AI_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000;
const summaryCache = new Map();

const normalizeCategory = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const tryParseAIDraftJSON = (rawText = "") => {
  if (!rawText || typeof rawText !== "string") return null;

  const candidates = [rawText.trim()];

  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(rawText.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== "object") continue;

      const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
      const description =
        typeof parsed.description === "string" ? parsed.description.trim() : "";

      if (!title || !description) continue;
      return { title, description };
    } catch (error) {
      // Try next candidate shape.
    }
  }

  return null;
};

const sanitizeAIDraftText = (value = "") => {
  if (typeof value !== "string") return "";

  return value
    .replace(/\+\s*\d+\s*(to|-|–|—)\s*\+?\s*\d+\s*(sentences?|words?)/gi, "")
    .replace(/\b\d+\s*(to|-|–|—)\s*\d+\s*(sentences?|words?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const stripEmptyListItems = (html = "") => {
  if (typeof html !== "string") return html;
  
  // Remove empty <li> tags and list items with only whitespace/numbers
  return html
    .replace(/<li>\s*<\/li>/gi, "")
    .replace(/<li>\s*(\d+)\s*\.\s*<\/li>/gi, "")
    .replace(/<li>\s*(\d+)\s*\.\s*(?=<\/li>)/gi, "")
    .replace(/<li>\s*\.\s*<\/li>/gi, "")
    .replace(/<li>\s*[-•*]\s*<\/li>/gi, "");
};

const cleanupAIDraftHTML = (html = "") => {
  if (typeof html !== "string") return html;
  
  let cleaned = stripEmptyListItems(html);
  
  // Remove completely empty sections (headings with no following content)
  cleaned = cleaned.replace(/<h[2-3]>[^<]*<\/h[2-3]>\s*(<h[2-3]>|<\/[^>]+>|$)/gi, "");
  
  return cleaned;
};

const sanitizeAIDraft = (draft = {}) => ({
  ...draft,
  title: sanitizeAIDraftText(draft.title || ""),
  description: cleanupAIDraftHTML(sanitizeAIDraftText(draft.description || "")),
});

const stripHtmlForDraftChecks = (value = "") =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const isFullDraftDescription = (description = "") => {
  const plainText = stripHtmlForDraftChecks(description);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const sectionCount = (description.match(/<h2>/gi) || []).length;

  return plainText.length >= 900 && wordCount >= 150 && sectionCount >= 4;
};

const ensureFullAIDraft = (draft = {}, context = {}) => {
  const sanitizedDraft = sanitizeAIDraft(draft);
  const fallbackDraft = sanitizeAIDraft(generateLocalDraft(context));

  const finalTitle = sanitizedDraft.title || fallbackDraft.title;

  if (isFullDraftDescription(sanitizedDraft.description)) {
    return {
      draft: {
        title: finalTitle,
        description: sanitizedDraft.description,
      },
      expanded: false,
    };
  }

  return {
    draft: {
      title: finalTitle,
      description: fallbackDraft.description,
    },
    expanded: true,
  };
};

// =================== MULTI-PROVIDER AI HELPERS ===================
// Provider order: Gemini (free tier) → OpenAI (optional backup) → Local fallback

const tryGeminiDraft = async ({ topic, category, tone }) => {
  if (!gemini)
    return { draft: null, error: "gemini_not_configured" };

  try {
    console.log("🟡 Attempting Gemini draft generation with model:", GEMINI_MODEL);
    
    // List of model names to try (most likely first)
    const modelNames = [
      GEMINI_MODEL,
      "models/gemini-2.5-pro",
      "models/gemini-2.0-flash",
      "models/gemini-pro-latest"
    ];

    for (const modelName of modelNames) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const safeCategory = (category || "Programming").trim();
        const safeTone = (tone || "professional").trim();
        const prompt = `You are a technical blog writer. Generate a complete, well-structured blog post in JSON format.

Return ONLY valid JSON with exactly these fields:
{
  "title": "Article title (about 10-12 words)",
  "description": "Complete HTML article content"
}

HTML Structure Requirements:
- Use proper semantic HTML5 tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- Start with an Introduction <h2> section
- Include at least 6-8 major <h2> sections
- Each section should have 2-4 paragraphs or lists (minimum 3-4 sentences per paragraph)
- Use <ul> for bullet lists and <ol> for numbered lists  
- Include 3-4 substantive points in each list
- End with a Conclusion <h2> section
- No markdown code blocks - use proper HTML only
- Minimum 1200+ words total
- Format for editor readability: clean HTML with proper spacing and clear hierarchy
- Do NOT include placeholder text like "100-250 words" or "5-10 items"
- Do NOT use markdown syntax - only HTML tags

Topic: ${topic}
Category: ${safeCategory}
Tone: ${safeTone}

Write a comprehensive, professional article that developers would actually want to read and reference.`;

        const response = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), AI_TIMEOUT_MS)
          ),
        ]);

        const content = response.response.text();
        if (!content) {
          console.log(`⚠️ Model ${modelName} returned empty`);
          continue;
        }

        const parsed = tryParseAIDraftJSON(content);
        if (!parsed) {
          console.log(`⚠️ Model ${modelName} returned unparsable draft format`);
          continue;
        }

        console.log(`✅ Gemini draft generation successful with model: ${modelName}`);
        return { draft: sanitizeAIDraft(parsed), provider: "gemini" };
      } catch (modelError) {
        console.log(`⚠️ Model ${modelName} failed:`, modelError.message);
        if (modelName === modelNames[modelNames.length - 1]) {
          throw modelError;
        }
        continue;
      }
    }
  } catch (error) {
    const errorCode = error.message?.includes("429") ? "gemini_rate_limit" : "gemini_failed";
    return { draft: null, error: errorCode };
  }
};



const tryGeminiSummarize = async (content) => {
  if (!gemini) {
    console.error("🔴 Gemini not configured (GEMINI_API_KEY missing)");
    return { summary: null, error: "gemini_not_configured" };
  }

  try {
    console.log("🟡 Attempting Gemini summarize with model:", GEMINI_MODEL);
    
    // List of model names to try (most likely first)
    const modelNames = [
      GEMINI_MODEL,
      "models/gemini-2.5-pro",
      "models/gemini-2.0-flash",
      "models/gemini-pro-latest"
    ];

    for (const modelName of modelNames) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const prompt = `Summarize this blog content into a concise 3-4 line TL;DR:\n\n${content}`;

        const response = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), AI_TIMEOUT_MS)
          ),
        ]);

        const summary = response.response.text().trim();
        if (!summary) {
          console.error("🔴 Gemini returned empty response");
          continue;
        }

        console.log(`✅ Gemini summarization successful with model: ${modelName}`);
        return { summary, provider: "gemini" };
      } catch (modelError) {
        console.log(`⚠️ Model ${modelName} failed:`, modelError.message);
        if (modelName === modelNames[modelNames.length - 1]) {
          throw modelError; // Re-throw on last attempt
        }
        continue; // Try next model
      }
    }
  } catch (error) {
    console.error("🔴 Gemini error (all models tried):", error.message);
    const errorCode = 
      error.message?.includes("429") ? "gemini_rate_limit" : 
      error.message?.includes("401") ? "gemini_invalid_key" : 
      error.message?.includes("404") ? "gemini_model_not_found" :
      "gemini_failed";
    return { summary: null, error: errorCode };
  }
};

// =================== END MULTI-PROVIDER HELPERS ===================

// =================== LOCAL SUMMARIZATION HELPER ===================
const generateLocalSummary = (content) => {
  try {
    // Extract text from HTML
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) return text.slice(0, 220);
    
    // Extract key sentences (first 2-3 sentences or until 180 chars)
    let summary = "";
    for (const sentence of sentences) {
      if (summary.length < 180) {
        summary += sentence.trim() + " ";
      } else {
        break;
      }
    }
    
    return "TL;DR: " + summary.trim().slice(0, 220) + "...";
  } catch (error) {
    console.error("🔴 Local summarization error:", error.message);
    return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220) + "...";
  }
};

const generateLocalDraft = ({ topic, category, tone = "professional" }) => {
  const safeTopic = (topic || "Untitled Topic").trim();
  const safeCategory = (category || "General").trim();

  const title =
    safeTopic.length > 7
      ? `${safeTopic}: Practical Guide for ${safeCategory}`
      : `${safeCategory} Guide: ${safeTopic || "Getting Started"}`;

  const body = `<h2>Introduction</h2>
<p><strong>${safeTopic}</strong> is a fundamental concept in ${safeCategory} that every developer should understand. This comprehensive guide walks you through the essential principles, real-world applications, and best practices to master this topic.</p>
<p>Whether you're building your first project or optimizing existing solutions, understanding ${safeTopic} will significantly improve your code quality and development efficiency.</p>

<h2>What is ${safeTopic}?</h2>
<p>${safeTopic} refers to the practice of optimizing and improving the way we work with ${safeCategory}. It encompasses a range of techniques and methodologies designed to enhance performance, maintainability, and scalability.</p>
<p>In the context of modern development, ${safeTopic} plays a crucial role in:</p>
<ul>
<li>Improving application performance and user experience</li>
<li>Reducing development time and complexity</li>
<li>Ensuring code reliability and maintainability</li>
<li>Scaling systems efficiently</li>
</ul>

<h2>Core Principles</h2>
<p>To effectively work with ${safeTopic}, you should master these fundamental principles:</p>
<ul>
<li><strong>Clarity and Simplicity:</strong> Keep your code and approach clear and well-documented. Use meaningful names and write code that your teammates can easily understand without extensive documentation.</li>
<li><strong>Consistency Across Projects:</strong> Apply the same patterns and practices consistently across your codebase. This builds predictability and makes the code easier to maintain over time.</li>
<li><strong>Performance Awareness:</strong> Always consider the impact on application speed, memory usage, and resource consumption. Measure and optimize bottlenecks before premature optimization becomes counterproductive.</li>
<li><strong>Long-term Maintainability:</strong> Write code that is easy to understand and modify in the future. Consider how your code will be maintained and updated by other developers or even yourself months later.</li>
<li><strong>Comprehensive Testing:</strong> Validate your implementations thoroughly with unit tests, integration tests, and end-to-end tests before deploying to production. Test edge cases and error scenarios.</li>
</ul>

<h2>Getting Started</h2>
<p>Here's a practical step-by-step approach to begin working with ${safeTopic}:</p>
<ol>
<li><strong>Learn the Fundamentals:</strong> Start by understanding the core concepts and principles behind ${safeTopic}. Read documentation, watch tutorials, and understand why these practices matter in ${safeCategory}.</li>
<li><strong>Study Real-World Examples:</strong> Examine how experienced developers implement ${safeTopic} in production. Look at open-source projects and industry best practices to see different approaches.</li>
<li><strong>Practice with Small Projects:</strong> Begin with small, manageable projects to build your confidence. Start simple and gradually add complexity as you gain experience.</li>
<li><strong>Review and Refactor Your Code:</strong> After completing a project, review your implementation. Identify areas for improvement and refactor to apply the principles you've learned.</li>
<li><strong>Collaborate and Get Feedback:</strong> Share your code with peers and discuss your implementation. Constructive feedback helps you learn and improve faster.</li>
<li><strong>Build Progressively:</strong> Move from small projects to larger applications. Apply what you've learned to increasingly complex scenarios in your production work.</li>
</ol>

<h2>Common Pitfalls to Avoid</h2>
<p>When working with ${safeTopic}, developers frequently encounter these common mistakes:</p>
<ul>
<li><strong>Skipping Planning:</strong> Not planning ahead before implementation leads to refactoring and rework. Always design the solution before coding.</li>
<li><strong>Over-Engineering:</strong> Overcomplicating solutions when simpler approaches would work just fine. Keep solutions as simple as possible while meeting requirements.</li>
<li><strong>Ignoring Performance:</strong> Neglecting performance implications until problems arise in production. Consider efficiency from the beginning.</li>
<li><strong>Missing Error Handling:</strong> Neglecting proper error handling and edge cases in your implementation. Consider what can go wrong and handle it gracefully.</li>
<li><strong>Sacrificing Maintainability:</strong> Writing code without considering how other developers will work with it in the future. Always optimize for readability.</li>
<li><strong>Skipping Testing:</strong> Releasing code without thorough testing leads to bugs in production. Test thoroughly before deployment.</li>
</ul>

<h2>Best Practices</h2>
<p>Follow these industry-proven best practices to achieve the best results with ${safeTopic}:</p>
<ul>
<li><strong>Code Quality:</strong> Write clean, readable code with meaningful variable and function names that clearly express intent.</li>
<li><strong>Documentation:</strong> Document your logic, design decisions, and any complex algorithms. Include comments where the "why" isn't obvious.</li>
<li><strong>Design Patterns:</strong> Use appropriate design patterns and architectural patterns that fit your specific use case and requirements.</li>
<li><strong>Rigorous Testing:</strong> Test thoroughly across different scenarios. Include unit tests, integration tests, and edge case testing.</li>
<li><strong>Code Review:</strong> Review and refactor regularly. Have peers review your code before merging to production.</li>
<li><strong>Continuous Learning:</strong> Keep learning and stay updated with latest trends, tools, and best practices in your field.</li>
</ul>

<h2>Advanced Techniques</h2>
<p>Once you've mastered the basics of ${safeTopic}, expand your skills with these advanced techniques:</p>
<ul>
<li><strong>Profiling and Optimization:</strong> Use profiling tools to identify bottlenecks and optimize critical paths in your code for better performance.</li>
<li><strong>Advanced Architectural Patterns:</strong> Explore microservices, domain-driven design, event-driven architecture, and other advanced patterns for complex systems.</li>
<li><strong>Framework Integration:</strong> Learn how to effectively integrate ${safeTopic} principles with modern frameworks and libraries in your ecosystem.</li>
<li><strong>Scaling Strategies:</strong> Understand horizontal scaling, caching strategies, database optimization, and load balancing for large applications.</li>
<li><strong>Monitoring and Analytics:</strong> Implement comprehensive monitoring, logging, and analytics to track performance and identify issues in production.</li>
</ul>

<h2>Real-World Applications</h2>
<p>${safeTopic} principles are essential in production systems across the industry. Teams in ${safeCategory} leverage these techniques to:</p>
<ul>
<li><strong>Build Robust Applications:</strong> Create systems that are reliable, fault-tolerant, and recoverable from errors.</li>
<li><strong>Deliver Rapidly:</strong> Use efficient development practices to deliver features faster while maintaining quality.</li>
<li><strong>Maintain Quality at Scale:</strong> Keep code quality consistent and maintainable as projects grow in size and complexity.</li>
<li><strong>Reduce Production Issues:</strong> Minimize bugs and production incidents through proper testing and careful implementation.</li>
</ul>

<h2>Tools and Resources</h2>
<p>Several tools and resources can accelerate your learning and mastery of ${safeTopic}:</p>
<ul>
<li><strong>Official Documentation:</strong> Read the official documentation and guides for the technologies and frameworks you're using.</li>
<li><strong>Learning Platforms:</strong> Take advantage of community-driven tutorials, online courses, and educational platforms dedicated to your field.</li>
<li><strong>Development Tools:</strong> Use IDEs, linters, type checkers, and other development tools that support and enforce best practices.</li>
<li><strong>Libraries and Frameworks:</strong> Leverage well-designed libraries and frameworks that demonstrate and implement these patterns effectively.</li>
<li><strong>Community Resources:</strong> Participate in developer communities, forums, and discussion groups where professionals share knowledge and experiences.</li>
</ul>

<h2>Conclusion</h2>
<p>Mastering ${safeTopic} is essential for modern ${safeCategory} development. By understanding the core principles, following best practices, and continuously learning, you'll be able to write better code and build more efficient applications.</p>
<p>Start implementing these concepts in your next project, and don't hesitate to revisit and refactor as you learn new techniques. Happy coding!</p>`;

  return { title, description: body };
};

const getCachedSummary = (cacheKey) => {
  const hit = summaryCache.get(cacheKey);
  if (!hit) return null;

  if (Date.now() > hit.expiresAt) {
    summaryCache.delete(cacheKey);
    return null;
  }

  return hit.payload;
};

const setCachedSummary = (cacheKey, payload) => {
  summaryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS,
  });
};

const normalizeAIErrorCode = (error) => {
  if (!error) return undefined;
  if (typeof error.code === "string" && error.code.trim()) return error.code.trim();
  if (typeof error.status === "number") return `http_${error.status}`;
  return "unknown_error";
};

const buildTextEmbedding = (text = "") => {
  const vecLength = 64;
  const vec = Array(vecLength).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  words.forEach((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i += 1) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % vecLength;
    vec[idx] += 1;
  });

  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
};

const cosineSimilarity = (a = [], b = []) => {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const generateOpenAIDraft = async ({ topic, category, tone = "professional" }) => {
  // Try providers in order: Gemini (free) → Local fallback

  // 1. Try Gemini
  const geminiResult = await tryGeminiDraft({ topic, category, tone });
  if (geminiResult.draft) {
    const { draft, expanded } = ensureFullAIDraft(geminiResult.draft, {
      topic,
      category,
      tone,
    });

    return { draft, provider: "gemini", expanded };
  }

  // 2. Fall back to local generation
  console.log("⚠️ Gemini failed, using local draft generation");
  const localDraft = sanitizeAIDraft(generateLocalDraft({ topic, category, tone }));
  return {
    draft: localDraft,
    error: geminiResult.error || "gemini_failed",
    expanded: false,
  };
};

const summarizeWithOpenAI = async (content) => {
  // Try providers in order: Gemini (free) → Local intelligent fallback

  // 1. Try Gemini
  console.log("📋 Starting summarization attempt...");
  const geminiResult = await tryGeminiSummarize(content);
  if (geminiResult.summary) {
    console.log("✅ Using Gemini summary");
    return { summary: geminiResult.summary, provider: "gemini" };
  }

  // 2. Fall back to intelligent local summarization
  console.log("⚠️ Gemini failed, using intelligent local summarization");
  const localSummary = generateLocalSummary(content);
  return {
    summary: localSummary,
    error: geminiResult.error || "gemini_failed",
  };
};

//===================CREATE POST
// POST : api/posts
//PROTECTED
const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;
    if (!title || !category || !description || !req.files) {
      return next(
        new HttpError("Fill in all fields and choose thumbnail.", 422)
      );
    }
    const { thumbnail } = req.files;
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError("Thumbnail too big. File should be less than 2MB", 422)
      );
    }
    let fileName = thumbnail.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];
    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err.message, 500)); // Include a message and status code
        } else {
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFilename, // Fixed typo here
            creator: req.user.id,
          });

          const embeddingText = `${title} ${category} ${description}`;
          newPost.embedding = buildTextEmbedding(embeddingText);
          await newPost.save();

          if (!newPost) {
            return next(new HttpError("Post couldn't be created.", 422));
          }
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
          await cacheDeleteByPrefix("posts:");
          res.status(201).json(newPost);
        }
      }
    );
  } catch (error) {
    return next(new HttpError(error.message, 500)); // Include a message and status code
  }
};

//===================GET POSTS
// GET : api/posts
//PROTECTED
const getPosts = async (req, res, next) => {
  try {
    const cacheKey = "posts:all";
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const posts = await Post.find().sort({ updatedAt: -1 });
    await cacheSet(cacheKey, posts, 300);
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//===================GET SINGLE POST
// GET : api/posts/:ID
//PROTECTED
const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const cacheKey = `posts:${postId}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }

    await cacheSet(cacheKey, post, 300);
    res.status(201).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//===================ADVANCED SEARCH
// GET : api/posts/search?q=&category=&author=&from=&to=
const searchPosts = async (req, res, next) => {
  try {
    const { q = "", category, author, from, to } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (author) filters.creator = author;
    if (from || to) {
      filters.createdAt = {};
      if (from) filters.createdAt.$gte = new Date(from);
      if (to) filters.createdAt.$lte = new Date(to);
    }

    if (q.trim()) {
      const textMatches = await Post.find(
        { ...filters, $text: { $search: q.trim() } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .limit(50);

      if (textMatches.length) {
        return res.status(200).json(textMatches);
      }

      const regex = new RegExp(q.trim(), "i");
      const fallback = await Post.find({
        ...filters,
        $or: [{ title: regex }, { description: regex }, { category: regex }],
      })
        .sort({ createdAt: -1 })
        .limit(50);
      return res.status(200).json(fallback);
    }

    const posts = await Post.find(filters).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError("Failed to search posts.", 500));
  }
};

//================== GET POSTS BY CATEGORY
// GET : api/posts/categories/:category
//PROTECTED
const getPostbyCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const decodedCategory = decodeURIComponent(category || "");

    // Fast path: exact case-insensitive match for direct category names.
    let catPosts = await Post.find({
      category: { $regex: new RegExp(`^${decodedCategory}$`, "i") },
    }).sort({ createdAt: -1 });

    // Fallback: support slug-style params like "mobileappdevelopment".
    if (!catPosts.length) {
      const allPosts = await Post.find().sort({ createdAt: -1 });
      const normalizedRequested = normalizeCategory(decodedCategory);
      catPosts = allPosts.filter(
        (post) => normalizeCategory(post.category) === normalizedRequested
      );
    }

    res.status(200).json(catPosts);
  } catch (err) {
    return next(new HttpError("Error fetching category posts", 500));
  }
};

//===================RECOMMENDATIONS
// GET : api/posts/:id/recommendations
const getRecommendedPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const target = await Post.findById(id);
    if (!target) return next(new HttpError("Post not found.", 404));

    const targetEmbedding =
      target.embedding?.length > 0
        ? target.embedding
        : buildTextEmbedding(`${target.title} ${target.category} ${target.description}`);

    if (!target.embedding?.length) {
      target.embedding = targetEmbedding;
      await target.save();
    }

    const candidates = await Post.find({ _id: { $ne: id } }).limit(200);

    const ranked = candidates
      .map((post) => {
        const emb =
          post.embedding?.length > 0
            ? post.embedding
            : buildTextEmbedding(`${post.title} ${post.category} ${post.description}`);
        return {
          post,
          score: cosineSimilarity(targetEmbedding, emb),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => ({ ...entry.post.toObject(), similarity: Number(entry.score.toFixed(4)) }));

    res.status(200).json(ranked);
  } catch (error) {
    return next(new HttpError("Failed to generate recommendations.", 500));
  }
};


//================= GET USER/ AUTHOR POST
// GET: api/posts/users/:id
// UNPROTECTED
const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find posts where creator = id
    const userPosts = await Post.find({ creator: id }).sort({ createdAt: -1 });

    res.status(200).json(userPosts);
  } catch (err) {
    console.error("Error in getUserPosts:", err.message);
    return next(new HttpError("Fetching user posts failed", 500));
  }
};

//===================GENERATE AI DRAFT
// POST : api/posts/ai/draft
//PROTECTED
const generateAIDraft = async (req, res, next) => {
  try {
    const { topic, category, tone } = req.body;

    if (!topic || !topic.trim()) {
      return next(new HttpError("Topic is required to generate AI draft.", 422));
    }

    const normalizedTopic = topic.trim();
    const normalizedCategory = (category || "Programming").trim();
    const normalizedTone = (tone || "professional").trim();

    const { draft: aiDraft, provider, error, expanded } = await generateOpenAIDraft({
      topic: normalizedTopic,
      category: normalizedCategory,
      tone: normalizedTone,
    });

    if (aiDraft) {
      const cleanedDraft = sanitizeAIDraft(aiDraft);
      return res.status(200).json({
        ...cleanedDraft,
        aiSource: provider,
        aiExpanded: Boolean(expanded),
      });
    }

    const fallbackDraft = sanitizeAIDraft(
      generateLocalDraft({
        topic: normalizedTopic,
        category: normalizedCategory,
        tone: normalizedTone,
      })
    );
    return res.status(200).json({
      ...fallbackDraft,
      aiSource: "fallback",
      aiExpanded: false,
      ...(error ? { aiErrorCode: error } : {}),
    });
  } catch (error) {
    return next(new HttpError("Failed to generate AI draft.", 500));
  }
};

//===================SUMMARIZE CONTENT
// POST : api/posts/ai/summarize
//UNPROTECTED
const summarizePostContent = async (req, res, next) => {
  try {
    const maxChars = Number(process.env.SUMMARY_MAX_INPUT_CHARS) || 8000;
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return next(new HttpError("Content is required for summarization.", 422));
    }

    if (content.length > maxChars) {
      return next(
        new HttpError(`Content too long. Max allowed length is ${maxChars} chars.`, 422)
      );
    }

    const cacheKey = content.trim().toLowerCase();
    const cachedSummary = getCachedSummary(cacheKey);

    if (cachedSummary) {
      return res.status(200).json({
        summary: cachedSummary.summary,
        aiSource: cachedSummary.aiSource,
        cached: true,
      });
    }

    const { summary: aiSummary, provider, error } = await summarizeWithOpenAI(content);

    const payload = {
      summary: aiSummary,
      aiSource: provider || "local",
      ...(error && { aiErrorCode: error }),
    };

    setCachedSummary(cacheKey, payload);

    return res.status(200).json({
      ...payload,
      cached: false,
    });
  } catch (error) {
    return next(new HttpError("Failed to summarize content.", 500));
  }
};


//===================DELETE POST
// POST : api/posts/:id
//UNPROTECTED
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id; // Extract postId from request parameters

    if (!postId) {
      return next(new HttpError("Post unavailable.", 400));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }

    const filename = post.thumbnail;
    if(req.user.id === post.creator){
    fs.unlink(path.join(__dirname, "..", "uploads", filename), async (err) => {
      if (err) {
        return next(new HttpError("Failed to delete thumbnail.", 500));
      } else {
        await Post.findByIdAndDelete(postId); // Corrected to findByIdAndDelete

        const currentUser = await User.findById(req.user.id);
        if (currentUser) {
          const userPostCount = currentUser.posts - 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
        }
      
        await cacheDeleteByPrefix("posts:");
        res.json({ message: `Post ${postId} deleted successfully` });
      }
    
    });
    }else{
      return next(new HttpError("Post couldnt't be deleted.",403))
    }
  } catch (error) {
    return next(new HttpError("Something went wrong.", 500));
  }
};

//===================EDIT POST
// PATCH : api/posts/:id
//UNPROTECTED
const editPost = async (req, res, next) => {
  try {
    let filename;
    let newFilename;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;
    if (!title || !category || description.length < 12) {
      return next(new HttpError("Invalid input data.", 400));
    }
    if (!req.files) {
      const currentPost = await Post.findById(postId);
      if (currentPost && req.user.id === String(currentPost.creator)) {
        const versionCount = await PostVersion.countDocuments({ postId });
        await PostVersion.create({
          postId,
          editedBy: req.user.id,
          version: versionCount + 1,
          snapshot: {
            title: currentPost.title,
            category: currentPost.category,
            description: currentPost.description,
            thumbnail: currentPost.thumbnail,
          },
        });
      }

      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          embedding: buildTextEmbedding(
            `${title.trim()} ${category.trim()} ${description.trim()}`
          ),
        }, // Trim to remove extra quotes
        { new: true }
      );
    } else {
      // Get old post from database
      const oldPost = await Post.findById(postId);
      if(req.user.id === oldPost.creator){
      if (!oldPost) {
        return next(new HttpError("Post not found.", 404));
      }

      const versionCount = await PostVersion.countDocuments({ postId });
      await PostVersion.create({
        postId,
        editedBy: req.user.id,
        version: versionCount + 1,
        snapshot: {
          title: oldPost.title,
          category: oldPost.category,
          description: oldPost.description,
          thumbnail: oldPost.thumbnail,
        },
      });

      fs.unlink(
        path.join(__dirname, "..", "uploads", oldPost.thumbnail),
        (err) => {
          if (err) {
            console.error("Failed to delete old thumbnail:", err);
          }
        }
      );
      // Upload new thumbnail
      const { thumbnail } = req.files;
      if (thumbnail.size > 2000000) {
        return next(
          new HttpError("Thumbnail too big. Should be less than 2MB", 400)
        );
      }
      fileName = thumbnail.name;
      let splittedFilename = fileName.split(".");
      newFilename =
        splittedFilename[0] +
        uuid() +
        "." +
        splittedFilename[splittedFilename.length - 1];
      thumbnail.mv(
        path.join(__dirname, "..", "uploads", newFilename),
        async (err) => {
          if (err) {
            return next(new HttpError("Failed to upload new thumbnail.", 500));
          }
        }
      );
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          thumbnail: newFilename,
          embedding: buildTextEmbedding(
            `${title.trim()} ${category.trim()} ${description.trim()}`
          ),
        }, // Trim to remove extra quotes
        { new: true }
      );
    }
  }
    if (!updatedPost) {
      return next(new HttpError("Couldn't update post.", 400));
    }
    await cacheDeleteByPrefix("posts:");
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError("Something went wrong.", 500));
  }
};

module.exports = {
  createPost,
  getPost,
  searchPosts,
  getRecommendedPosts,
  getPostbyCategory,
  getPosts,
  editPost,
  deletePost,
  getUserPosts,
  generateAIDraft,
  summarizePostContent,
};
