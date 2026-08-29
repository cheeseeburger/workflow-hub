// Pushes an approved document into a SharePoint document library via
// Microsoft Graph. Requires an Azure AD app registration with
// Sites.ReadWrite.All (application permission, admin-consented).
//
// This uses the OAuth2 client-credentials flow (app-only, no user login) --
// the standard pattern for a server-to-server sync job like this one.

const fetch = require('node-fetch');
const fs = require('fs');

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getGraphToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry - 60000) return cachedToken;

  const { GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET } = process.env;
  if (!GRAPH_TENANT_ID || !GRAPH_CLIENT_ID || !GRAPH_CLIENT_SECRET) {
    throw new Error('Graph credentials not configured (see .env.example)');
  }

  const url = `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: GRAPH_CLIENT_ID,
    client_secret: GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const resp = await fetch(url, { method: 'POST', body });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Graph auth failed: ${JSON.stringify(data)}`);

  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

// Uploads a local file into the configured SharePoint drive, under
// /ApprovedDocuments/<category>/<filename>
async function uploadToSharePoint(localPath, filename, category) {
  const { SHAREPOINT_DRIVE_ID } = process.env;
  if (!SHAREPOINT_DRIVE_ID) throw new Error('SHAREPOINT_DRIVE_ID not configured');

  const token = await getGraphToken();
  const fileBuffer = fs.readFileSync(localPath);
  const folder = encodeURIComponent(category || 'Uncategorized');
  const safeName = encodeURIComponent(filename);

  const url = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/root:/ApprovedDocuments/${folder}/${safeName}:/content`;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream'
    },
    body: fileBuffer
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`SharePoint upload failed: ${JSON.stringify(data)}`);

  return { sharePointItemId: data.id, webUrl: data.webUrl };
}

module.exports = { uploadToSharePoint };
