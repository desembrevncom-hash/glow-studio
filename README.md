<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-huCv5bYEEiQoufkD9SrlJoQNYLAKKsD

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment Rules

**IMPORTANT:** Do NOT use the old AI Studio 'Publish' button for production. AI Studio publish only hosts static frontend files and does not run the required Node.js backend (/api/photoshoots).

To deploy this application correctly:
1. **GitHub + Cloud Run = Production:** Connect this GitHub repository to Google Cloud Run.
2. Cloud Run will automatically build using the included \Dockerfile\ and serve the full stack.
3. Remember to set \NODE_ENV=production\ and \GEMINI_API_KEY\ in your Cloud Run environment variables.

