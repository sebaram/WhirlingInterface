# WhirlingInterface

[Project Page](https://juyounglee.net/projects/whirling)

This work is presented in IEEE ISMAR 2024.

## DEMO

**[Live demos on GitHub Pages](https://sebaram.github.io/WhirlingInterface/)**

Built with Mediapipe, Aframe (WebXR)
- Recommend to test on laptop/PC
- For mobile, landscape mode is recommended
- Can move your view with "WASD" or "Arrow keys"

Webcam (MediaPipe hand tracking):
- [12 targets at 2m](https://sebaram.github.io/WhirlingInterface/whirling/demo/demo_12targets.html)
- [2 targets, very close](https://sebaram.github.io/WhirlingInterface/whirling/demo/demo_2targets.html)

Headset (WebXR hand tracking):
- [2 targets, WebXR only](https://sebaram.github.io/WhirlingInterface/whirling/demo/demo_2targets_onlywebxr.html)
- [Hand interaction sandbox](https://sebaram.github.io/WhirlingInterface/whirling/demo/hands.html)
- [Hand skeleton viewer](https://sebaram.github.io/WhirlingInterface/whirling/demo/hands_samsung.html)

### Running locally

```
npm install
npm run dev     # http://localhost:1028
```

Demo pages load A-Frame and the A-Frame examples from CDN, so the gitignored
local `aframe/` checkout is no longer required to open them. Their own scripts
are referenced relatively (`../static/js/...`), which resolves correctly both
under the Express server and on GitHub Pages.

## Publication
Juyoung Lee, Seo Young Oh, Minju Baeck, Hui Shyong Yeo, Hyung-il Kim, Thad Starner, Woontack Woo, "Whirling Interface: Hand-based Motion Matching Selection for Small Target on XR Displays" 2024 IEEE International Symposium on Mixed and Augmented Reality

