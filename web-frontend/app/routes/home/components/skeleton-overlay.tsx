import { useEffect, useRef } from 'react';

import { type ViolenceDetectionPayload, ViolenceEventLabelMap } from '@/schemas/types';

import { abnormalCheck } from '../utils';

interface SkeletonOverlayProps {
  eventData?: ViolenceDetectionPayload;
  showSkeleton?: boolean;
  showBox?: boolean;
}

const CONNECTIONS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

export function SkeletonOverlay({
  eventData,
  showSkeleton = true,
  showBox = true,
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!eventData || !eventData.events || !Array.isArray(eventData.events)) return;

    eventData.events.forEach((event) => {
      // Determine color based on label
      const isAbnormal = abnormalCheck(event);
      const color = isAbnormal ? '#ef4444' : '#22c55e'; // red-500 or green-500

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      if (!event.skeletons || !Array.isArray(event.skeletons)) return;

      event.skeletons.forEach((skeleton) => {
        // Calculate Group Box
        if (skeleton.box && Array.isArray(skeleton.box) && skeleton.box.length === 4) {
          const [x, y, w, h] = skeleton.box;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x + w > maxX) maxX = x + w;
          if (y + h > maxY) maxY = y + h;
        }

        // Draw Skeleton
        if (showSkeleton && skeleton.keypoints && Array.isArray(skeleton.keypoints)) {
          // Draw points
          skeleton.keypoints.forEach((kp) => {
            if (!kp || kp.length < 3) return;
            const [x, y, conf] = kp;
            if (conf > 0.5) {
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }
          });

          // Draw connections
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          CONNECTIONS.forEach(([i, j]) => {
            const kp1 = skeleton.keypoints[i];
            const kp2 = skeleton.keypoints[j];
            if (kp1 && kp2 && kp1[2] > 0.5 && kp2[2] > 0.5) {
              ctx.beginPath();
              ctx.moveTo(kp1[0], kp1[1]);
              ctx.lineTo(kp2[0], kp2[1]);
              ctx.stroke();
            }
          });
        }
      });

      // Draw Group Box
      if (showBox && minX !== Number.POSITIVE_INFINITY) {
        const x = minX;
        const y = minY;
        const w = maxX - minX;
        const h = maxY - minY;

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Optional: draw label and confidence above the box
        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
        const text = `${ViolenceEventLabelMap[event.label]} (${(event.confidence * 100).toFixed(1)}%)`;

        // Add a background for the text for better visibility
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y > 20 ? y - 20 : y, textWidth + 8, 20);

        ctx.fillStyle = color;
        ctx.fillText(text, x + 4, y > 20 ? y - 6 : y + 14);
      }
    });
  }, [eventData, showSkeleton, showBox]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
    />
  );
}
