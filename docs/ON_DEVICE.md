# Zoro v0.8.0 — experimental on-device conversation

No Mac, native app build, OpenAI key or paid model API is required. This release adds WebLLM 0.2.85 with Qwen2.5-0.5B-Instruct-q4f32_1-MLC inside a Web Worker. The small model is intended for simple open-ended conversation and writing, not frontier-model reasoning.

## On your iPhone

1. Open the app in Safari and check the footer shows v0.8.0.
2. Open Assistant and find On-device AI.
3. Tap Check compatibility. It checks secure context, WebGPU and adapter buffer capacity without downloading model weights.
4. On Wi-Fi, tap Download & test model. This downloads model assets from Hugging Face and MLC/GitHub. It needs substantial storage and roughly 1 GB working memory.
5. Wait for Model ready, which appears only after an actual local generation test succeeds.
6. Try “Help me write a short introduction for an IT interview.”

Stop / unload ends the worker and releases the active model. Remove cached model deletes WebLLM's cached artifacts for this model. The browser may evict these files itself, and the user must load again after reloading the page. No automatic model download or activation occurs.

## Behavior and boundaries

- Existing authenticated server routes still provide account context, deterministic answers and confirmed actions. This is not an offline app.
- Only open-ended requests outside the deterministic secretary functions are eligible for model answers. Scheduling answers, action previews, scans and API errors are never overwritten by model output.
- Generation runs on the device. No prompts are sent to a model provider; the existing app server still receives chat requests for routing and account access.
- Model history and reference context are bounded. The model has no tools or ability to execute changes.
- Errors, timeouts or GPU failures fall back explicitly to the ordinary secretary response. Users can unload the worker to cancel an operation.
- Keep Safari active. iOS may suspend workers or lose GPU resources in the background. A capability check is not a promise that this model will fit or run fast enough; the generation test is required.

## Verification

Automated tests cover routing boundaries and prompt bounds, alongside the existing scheduling and confirmation tests. Production compilation validates worker bundling. Actual iPhone performance and model loading are unverified until the user runs the in-app test. Browser preview startup was blocked by policy in the development environment; no mobile compatibility success is claimed.

References: [WebLLM setup](https://webllm.mlc.ai/docs/user/get_started.html), [Web Worker integration](https://webllm.mlc.ai/docs/user/advanced_usage.html), [Safari 26 WebGPU](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).
