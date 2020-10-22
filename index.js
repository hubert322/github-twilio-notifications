const crypto = require("crypto");

function simpleResponse(statusCode, message) {
  let response = {
    message: message,
    status: statusCode
  };

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
    status: statusCode
  });
}

async function createHexSignature(requestBody) {
  let hmac = crypto.createHmac("sha1", SECRET_TOKEN);
  hmac.update(requestBody, "utf-8");
  return hmac.digest("hex");
}

async function checkSignature(formData, headers) {
  let expectedSignature = await createHexSignature(formData);
  let actualSignature = headers.get("X-Hub-Signature");
  return expectedSignature == actualSignature;
}

async function sendText(message) {
  const endpoint = "https://api.twilio.com/2010-04-01/Accounts/" + ACCOUNT_SID + "/Messages.json";

  let encoded = new URLSearchParams();
  encoded.append("TO", RECIPIENT);
  encoded.append("From", "+19388887573");
  encoded.append("Body", message);

  let token = btoa(ACCOUNT_SID + ":" + AUTH_TOKEN);

  const request = {
    body: encoded,
    method: "POST",
    headers: {
      "Authorization": `Basic ${token}`,
      "Content-type": "application/x-www-form-urlencoded"
    }
  };

  let result = await fetch(endpoint, request);
  result = await result.json();

  return new Response(JSON.stringify(result), request);
}

addEventListener('fetch', event => {
  event.respondWith(githubWebhookHandler(event.request))
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function githubWebhookHandler(request) {
  if (request.method !== "POST") {
    return simpleResponse(200, "Please send a POST request :)");
  }
  try {
    const formData = await request.json();
    const headers = await request.headers;
    const action = headers.get("X-GitHub-Event");
    const repoName = formData.repository.full_name;
    const senderName = formData.sender.login;

    if (!checkSignature(formData, headers)) {
      return simpleResponse(403, "Wrong password, try again :p");
    }

    return await sendText(`${senderName} casted spell: ${action} onto your repo ${repoName}`);
  }
  catch (e) {
    return simpleResponse(200, `Error: ${e}`);
  }
}
