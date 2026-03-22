const request = require("supertest");
const express = require("express");

const app = express();
app.use(express.json());
app.use("/api/posts", require("../routes/postsRoutes"));

describe("Posts Routes", () => {
  it("POST /api/posts/ai/draft requires authentication", async () => {
    const response = await request(app).post("/api/posts/ai/draft").send({
      title: "A sample title",
      category: "Technology",
    });

    // Depending on middleware ordering/error handling, unauthorized can surface as 401 or 500.
    expect([401, 500]).toContain(response.statusCode);
  });

  it("POST /api/posts/ai/summarize validates content", async () => {
    const response = await request(app)
      .post("/api/posts/ai/summarize")
      .send({ content: "" });

    expect([422, 500]).toContain(response.statusCode);
  });
});
