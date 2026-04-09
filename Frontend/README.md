# B_Inquery — Frontend

An interactive 3D web experience built with **React**, **Three.js**, and **React Three Fiber**. The frontend renders an immersive 3D scene featuring animated models, dynamic camera transitions, and keyboard-controlled navigation — connected to a Django REST API backend for ML-powered predictions.

---

## 🚀 Tech Stack

| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [Three.js](https://threejs.org/) | 3D rendering engine |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | React renderer for Three.js |
| [@react-three/drei](https://github.com/pmndrs/drei) | Useful R3F helpers & abstractions |
| [Theatre.js](https://www.theatrejs.com/) | 3D animation & scene editor |
| [Vite](https://vitejs.dev/) | Dev server & build tool |

---

## ✨ Features

- 🌐 **Immersive 3D Scene** — A central rotating 3D model (`Teliko`) surrounded by a dynamic environment
- 🎥 **Smooth Camera Transitions** — Press `Enter` to zoom into the scene interior with interpolated camera movement
- 🕹️ **Keyboard-Controlled Avatar** — A `WhiteBlod` character controllable via `W A S D` keys inside the scene
- 💡 **Dynamic Lighting** — Ambient light, directional key/fill lights, and an environment map for realistic reflections
- 🎬 **Theatre.js Integration** — Scene animation editor for fine-tuned model positioning and keyframe animation
- 🔄 **Auto-Rotation** — The main model rotates automatically when the camera is in the exterior view

---

## 📁 Project Structure

```
Frontend/
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── models/          # 3D model assets (gitignored — large binaries)
├── src/
│   ├── models/
│   │   ├── terrain/     # Environment & background models
│   │   └── Avatars/     # Playable character models
│   ├── App.jsx          # Main scene & camera logic
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

---

## 🎮 Controls

| Key | Action |
|---|---|
| `Enter` | Toggle zoom in/out of the 3D scene |
| `W` | Move avatar forward |
| `S` | Move avatar backward |
| `A` | Move avatar left |
| `D` | Move avatar right |
| Mouse drag | Orbit camera (exterior view only) |

---

## 🔗 Backend

This frontend will connect to a **Django REST Framework** backend for ML-based predictions.
Make sure the backend is running before using prediction features.

---

## 📝 Notes

- 3D model files (`.glb`, `.gltf`, `.fbx`, `.obj`) are **gitignored** due to their large size. You will need to source or re-export these separately.
- Theatre.js studio is initialized in development mode for scene editing.
