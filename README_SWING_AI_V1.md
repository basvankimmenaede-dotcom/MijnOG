# Mijn OG v2.9.6.0 - Swing Analyzer AI V1

Swing Analyzer is now an automatic, coach-supporting video analysis flow.

## Flow
1. Select an assigned player.
2. Record or choose a short side-view swing video on the phone.
3. Tap `AI-analyse starten`.
4. MediaPipe Pose Landmarker processes sampled video frames locally in the browser.
5. Mijn OG calculates eight technical indicators, confidence per indicator, two focus points and matching drills.
6. Optional exit velocity and coach notes can be added before saving.
7. The original video is not stored by Mijn OG in V1.

## Important
This remains a coaching aid, not a biomechanical lab measurement. Sequencing and the contact moment are proxies from single-camera pose data. Low-confidence measurements should not be treated as decisive.

## Supabase
- Fresh install: run `supabase_v295_swing_analyzer.sql`, then `supabase_v296_swing_ai.sql`.
- Existing Swing Analyzer V1 install: only run `supabase_v296_swing_ai.sql`.
