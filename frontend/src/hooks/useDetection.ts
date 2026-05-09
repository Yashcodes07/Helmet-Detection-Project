import { useState, useCallback } from "react";
import { detectImage, detectVideo } from "../utils/api";
import type { DetectionResult } from "../utils/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: DetectionResult; outputUrl: string }
  | { status: "error"; message: string };

export function useDetection() {
  const [state, setState] = useState<State>({ status: "idle" });

  const run = useCallback(async (file: File) => {
    setState({ status: "loading" });
    try {
      const isVideo = file.type.startsWith("video/");
      const result = isVideo ? await detectVideo(file) : await detectImage(file);
      setState({
        status: "success",
        result,
        outputUrl: result.output_url,
      });
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset };
}
