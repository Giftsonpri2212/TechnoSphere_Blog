const postsRoutes = require("../routes/postsRoutes");
const userRoutes = require("../routes/userRoutes");

describe("Route Modules", () => {
  it("should load posts and user routes", () => {
    expect(postsRoutes).toBeTruthy();
    expect(userRoutes).toBeTruthy();
  });
});
