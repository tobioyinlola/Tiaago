"use client";
import { useEffect } from "react";

import { IS_DEV } from "../../constants";
import { warmupBackend } from "../../services/warmup";

const BackendWarmupPing = () => {
  useEffect(() => {
    if (!IS_DEV) warmupBackend();
  }, []);

  return null;
};

export default BackendWarmupPing;
