const Post = require("../models/postModel");
const User = require("../models/userModel");
const { get } = require("mongoose");
const bcrypt = require("bcryptjs");
const HttpError = require("../models/errorModel");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

//===================CREATE POST
// POST : api/posts
//PROTECTED
const createPost = async (req, res, next) => {
  try {
    console.log("User:", req.user); // Add this line to debug
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
          if (!newPost) {
            return next(new HttpError("Post couldn't be created.", 422));
          }
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
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
    const posts = await Post.find().sort({ updatedAt: -1 });
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
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }
    res.status(201).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//================== GET POSTS BY CATEGORY
// GET : api/posts/categories/:category
//PROTECTED
const getPostbyCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPosts = await Post.find({
      category: { $regex: new RegExp(`^${category}$`, "i") } // match ignoring case
    }).sort({ createdAt: -1 });

    res.status(200).json(catPosts);
  } catch (err) {
    return next(new HttpError("Error fetching category posts", 500));
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
    if(req.user.id==post.creator){
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
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
        }, // Trim to remove extra quotes
        { new: true }
      );
    } else {
      // Get old post from database
      const oldPost = await Post.findById(postId);
      if(req.user.id==oldPsot.creator){
      if (!oldPost) {
        return next(new HttpError("Post not found.", 404));
      }
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
        }, // Trim to remove extra quotes
        { new: true }
      );
    }
  }
    if (!updatedPost) {
      return next(new HttpError("Couldn't update post.", 400));
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError("Something went wrong.", 500));
  }
};

module.exports = {
  createPost,
  getPost,
  getPostbyCategory,
  getPosts,
  editPost,
  deletePost,
  getUserPosts,
};
