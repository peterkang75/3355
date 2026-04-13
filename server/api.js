const express = require("express");
const router = express.Router();

const members = require("./routes/members");
const posts = require("./routes/posts");
const bookings = require("./routes/bookings");
const fees = require("./routes/fees");
const scores = require("./routes/scores");
const courses = require("./routes/courses");
const ntp = require("./routes/ntp");
const settings = require("./routes/settings");
const transactions = require("./routes/transactions");
const misc = require("./routes/misc");
const settlement = require("./routes/settlement");
const guest = require("./routes/guest");

router.use("/members", members);
router.use("/posts", posts);
router.use("/bookings", bookings);
router.use("/fees", fees);
router.use("/scores", scores);
router.use("/courses", courses);
router.use("/ntp", ntp);
router.use("/settings", settings);
router.use("/transactions", transactions);
router.use("/settlement", settlement);
router.use("/", guest);
router.use("/", misc);

module.exports = router;
