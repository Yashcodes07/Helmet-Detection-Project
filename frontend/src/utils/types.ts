export interface Detection {
  label: string;
  confidence: number;
  box: [number, number, number, number];
  frame?: number;
}

export interface ImageResult {
  helmet_detected: boolean;
  detections: Detection[];
  output_image: string;   // changed from output_url
  message: string;
}

export interface VideoResult {
  helmet_detected: boolean;
  helmet_frames: number;
  total_detections: number;
  detections: Detection[];
  output_image: string;   // changed from output_url
  message: string;
}

export type DetectionResult = ImageResult | VideoResult;
export type MediaType = "image" | "video";
