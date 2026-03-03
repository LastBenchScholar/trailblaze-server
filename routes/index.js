const debug = require("debug")("trailblaze:routes");
const authRoutes = require("./authRoutes");
const roadmapRoutes = require("./roadmapRoutes");
const { ssoRedirect } = require("../controllers/ssoController");

const initRoutes = (app) => {
  debug("Initialising routes...");

  app.use("/api/auth/sso", ssoRedirect); // Check for sso redirect

  app.use("/api/auth", authRoutes);
  app.use("/api/roadmaps", roadmapRoutes);

  app.get("/api", (req, res) =>
    res.json({ message: "FocusPilot API v1.0", status: "operational" }),
  );

  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
  });

  debug("Finished initialising routes");
};

module.exports = initRoutes;
