const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST"],
  credentials: true,
};

module.exports = corsOptions;
