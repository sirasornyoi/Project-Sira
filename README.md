<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7d84ac31-b97a-4f4d-a5a1-c0b5c8b13ea8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Cloud Run

To persist data across container restarts and redeployments, configure Cloud Run with Firestore:

1. **Enable Firestore Database**:
   - Create a Firestore database in Native mode (recommended region: `asia-southeast1`).
2. **Environment Variables**:
   - Set environment variable `PERSISTENCE=firestore` in your Cloud Run service.
3. **Cloud Run Scaling**:
   - Set maximum number of instances to `1` (`--max-instances=1`) to maintain cache consistency across requests.
4. **IAM Permissions**:
   - Ensure the Cloud Run service account has the **Cloud Datastore User** (`roles/datastore.user`) role to access Firestore with Application Default Credentials (ADC).
