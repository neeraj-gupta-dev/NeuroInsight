// backend/src/routes/sessions.js
const express  = require("express");
const Session  = require("../models/Session");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require auth
router.use(protect);

// ── POST /api/sessions ────────────────────────────────────────────────────
// Save a prediction snapshot for the current user
router.post("/", async (req, res) => {
  try {
    const {
      cognitiveState,
      confidence,
      epochId,
      subject,
      features,
      shapValues,
      allProbabilities,
    } = req.body;

    if (!cognitiveState) {
      return res.status(400).json({ message: "cognitiveState is required." });
    }

    const session = await Session.create({
      userId:           req.user._id,
      cognitiveState,
      confidence,
      epochId,
      subject,
      features,
      shapValues,
      allProbabilities,
    });

    res.status(201).json(session);
  } catch (err) {
    console.error("[sessions/post]", err.message);
    res.status(500).json({ message: "Failed to save session." });
  }
});

// ── GET /api/sessions ─────────────────────────────────────────────────────
// Retrieve session history for the current user (paginated)
router.get("/", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Session.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[sessions/get]", err.message);
    res.status(500).json({ message: "Failed to fetch sessions." });
  }
});

// ── DELETE /api/sessions ──────────────────────────────────────────────────
router.delete("/", async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.user._id });
    res.json({ message: "Session history cleared." });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear sessions." });
  }
});

module.exports = router;
