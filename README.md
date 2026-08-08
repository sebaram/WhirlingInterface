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

Headset (WebXR hand tracking, AR or VR):
- [12 targets](https://sebaram.github.io/WhirlingInterface/whirling/demo/demo_12targets_onlywebxr.html)
- [2 targets](https://sebaram.github.io/WhirlingInterface/whirling/demo/demo_2targets_onlywebxr.html)
- [Hand skeleton viewer](https://sebaram.github.io/WhirlingInterface/whirling/demo/hands_samsung.html)

Scenes: the webcam demos default to a museum gallery; add `?scene=outdoor` or
`?scene=lab` (plain grid) to either. The headset demos default to the plain
grid, since AR passthrough and a virtual room do not mix.

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

