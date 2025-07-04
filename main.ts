import { parse } from "@std/jsonc";
import { walk } from "https://deno.land/std@0.203.0/fs/walk.ts";

interface Config {
  luy_host: string;
  language: string;
  server: {
    port: number;
    hostname: string;
  };
}

async function loadConfig(): Promise<Config> {
  try {
    const configText = await Deno.readTextFile("./config.json");
    return parse(configText) as unknown as Config;
  } catch (error) {
    console.error(labels.main_error_config_load || "Could not load config.json, continuing with default configuration:", error);
    // Return default configuration
    return {
      luy_host: "https://luy.eam.elli.eco",
      language: "de",
      server: {
        port: 8080,
        hostname: "localhost"
      }
    };
  }
}

const config = await loadConfig();
let labels: Record<string, string> = {};

async function loadLabels(): Promise<void> {
  try {
    const labelsContent = await Deno.readTextFile(`./labels_${config.language}.json`);
    labels = JSON.parse(labelsContent);
  } catch (error) {
    console.error("Could not load labels file:", error);
    labels = {}; // Fallback to empty object
  }
}

async function serveStaticFile(filePath: string, contentType: string): Promise<Response> {
  try {
    const content = await Deno.readTextFile(filePath);
    return new Response(content, {
      headers: { "content-type": contentType },
    });
  } catch (error) {
    console.error(`${labels.main_error_serve_file || "Error serving file"} ${filePath}:`, error);
    return new Response(labels.main_error_file_not_found || "File not found", { status: 404 });
  }
}

async function serveBinaryFile(filePath: string, contentType: string): Promise<Response> {
  try {
    const content = await Deno.readFile(filePath);
    return new Response(content, {
      headers: { "content-type": contentType },
    });
  } catch (error) {
    console.error(`${labels.main_error_serve_file || "Error serving file"} ${filePath}:`, error);
    return new Response(labels.main_error_file_not_found || "File not found", { status: 404 });
  }
}

interface DataFilePair {
  timestamp: string;
  dataFile: string;
  metamodelFile: string;
}

async function getDataFilePairs(): Promise<string[]> {
  const dataDir = "./data";
  const timestampPattern = /^(\d{8}_\d{6})_(data|metamodel)\.json$/;
  const foundFiles = new Map<string, Set<string>>();

  try {
    // Walk through the data directory
    for await (const entry of walk(dataDir, {
      maxDepth: 1,
      includeFiles: true,
      includeDirs: false
    })) {
      if (entry.isFile) {
        const fileName = entry.name;
        const match = fileName.match(timestampPattern);

        if (match) {
          const timestamp = match[1];
          const fileType = match[2];

          if (!foundFiles.has(timestamp)) {
            foundFiles.set(timestamp, new Set());
          }
          foundFiles.get(timestamp)!.add(fileType);
        }
      }
    }

    // Filter to only include timestamps that have both data and metamodel files
    const validTimestamps = Array.from(foundFiles.entries())
        .filter(([timestamp, fileTypes]) =>
            fileTypes.has('data') && fileTypes.has('metamodel')
        )
        .map(([timestamp]) => timestamp)
        .sort()
        .reverse(); // Most recent first

    return validTimestamps;
  } catch (error) {
    console.error(labels.main_error_read_data || "Error reading data:", error);
    return [];
  }
}

// Add this route handler to your existing server setup
export async function handleDataFilesRequest(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    try {
      const timestamps = await getDataFilePairs();
      return new Response(JSON.stringify(timestamps), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Adjust CORS as needed
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: labels.main_error_load_data || "Could not load data" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(labels.main_error_function_not_available || "The requested function cannot be executed", { status: 405 });
}

async function handleDatasetRequest(timestamp: string): Promise<Response> {
  try {
    const dataFilePath = `./data/${timestamp}_data.json`;
    const metamodelFilePath = `./data/${timestamp}_metamodel.json`;
    
    const [dataText, metamodelText] = await Promise.all([
      Deno.readTextFile(dataFilePath),
      Deno.readTextFile(metamodelFilePath)
    ]);
    
    const data = JSON.parse(dataText);
    const metamodel = JSON.parse(metamodelText);
    
    const dataset = {
      data: data,
      metamodel: metamodel,
      timestamp: timestamp
    };
    
    return new Response(JSON.stringify(dataset), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error(`${labels.main_error_load_dataset || "Error loading dataset for"} ${timestamp}:`, error);
    return new Response(JSON.stringify({ error: labels.main_error_dataset_not_loaded || "Dataset could not be loaded" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDownloadRequest(request: Request): Promise<Response> {
  try {
    // Parse request body to get username and password
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: labels.main_error_username_password_required || "Username and password are required" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Load config to get luy_host
    const config = await loadConfig();
    const luyHost = config.luy_host;
    
    // Create timestamp for file naming
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') + '_' +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    
    // Create basic auth header
    const credentials = btoa(`${username}:${password}`);
    const authHeaders = {
      'Authorization': `Basic ${credentials}`
    };
    
    try {
      // Download metamodel document
      const metamodelUrl = `${luyHost}/api/metamodel`;
      console.log(`${labels.main_info_download_metamodel || "Loading metamodel from"} ${metamodelUrl}`);
      
      const metamodelResponse = await fetch(metamodelUrl, {
        method: 'GET',
        headers: authHeaders
      });
      
      if (!metamodelResponse.ok) {
        throw new Error(`${labels.main_error_download_metamodel || "Could not download metamodel"}: ${metamodelResponse.status} ${metamodelResponse.statusText}`);
      }
      
      const metamodelData = await metamodelResponse.text();
      const metamodelFilePath = `./data/${timestamp}_metamodel.json`;
      await Deno.writeTextFile(metamodelFilePath, metamodelData);
      console.log(`${labels.main_info_metamodel_saved || "Metamodel saved to"}: ${metamodelFilePath}`);
      
      // Download data document
      const dataUrl = `${luyHost}/api/data`;
      console.log(`${labels.main_info_download_data || "Loading data from"} ${dataUrl}`);
      
      const dataResponse = await fetch(dataUrl, {
        method: 'GET',
        headers: authHeaders
      });
      
      if (!dataResponse.ok) {
        throw new Error(`${labels.main_error_download_data || "Could not download data"}: ${dataResponse.status} ${dataResponse.statusText}`);
      }
      
      const dataText = await dataResponse.text();
      const dataFilePath = `./data/${timestamp}_data.json`;
      await Deno.writeTextFile(dataFilePath, dataText);
      console.log(`${labels.main_info_data_saved || "Data saved to"}: ${dataFilePath}`);
      
      return new Response(JSON.stringify({
        success: true,
        message: labels.main_success_data_downloaded || "Data downloaded successfully",
        timestamp: timestamp,
        files: {
          metamodel: `${timestamp}_metamodel.json`,
          data: `${timestamp}_data.json`
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (downloadError) {
      console.error(labels.main_error_download || "Download error:", downloadError);
      return new Response(JSON.stringify({ 
        error: labels.main_error_load_data_generic || "Could not load the data.",
        details: downloadError instanceof Error ? (downloadError.message || labels.main_error_unknown || "Unknown error") : String(downloadError)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error(labels.main_error_download_data || "Error downloading data:", error);
    return new Response(JSON.stringify({ error: labels.main_error_invalid_request_format || "Invalid request format" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleLabelsRequest(): Promise<Response> {
  try {
    return new Response(JSON.stringify(labels), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error(labels.main_error_load_labels || "Error loading labels file:", error);
    return new Response(JSON.stringify({ error: labels.main_error_load_labels || "Could not load labels" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Security: Only allow localhost
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return new Response(labels.main_error_forbidden_access || "Forbidden: You can only access from the local machine", {
      status: 403 
    });
  }

  // Handle API endpoints
  if (url.pathname === '/api/data-files') {
    return handleDataFilesRequest(request);
  }

  // Handle labels endpoint
  if (url.pathname === '/api/labels' && request.method === 'GET') {
    return handleLabelsRequest();
  }

  // Handle download endpoint
  if (url.pathname === '/api/download' && request.method === 'POST') {
    return handleDownloadRequest(request);
  }

  // Handle dataset endpoint: /api/dataset/{timestamp}
  const datasetMatch = url.pathname.match(/^\/api\/dataset\/(.+)$/);
  if (datasetMatch) {
    const timestamp = datasetMatch[1];
    return handleDatasetRequest(timestamp);
  }

  // Handle static files
  if (url.pathname === '/main.css') {
    return serveStaticFile('./main.css', 'text/css; charset=utf-8');
  }

  if (url.pathname === '/backend.js') {
    return serveStaticFile('./backend.js', 'application/javascript; charset=utf-8');
  }

  if (url.pathname === '/table.js') {
    return serveStaticFile('./table.js', 'application/javascript; charset=utf-8');
  }

  if (url.pathname === '/detail.js') {
    return serveStaticFile('./detail.js', 'application/javascript; charset=utf-8');
  }

  if (url.pathname === '/favicon.png') {
    return serveBinaryFile('./favicon.png', 'image/png;');
  }

  if (url.pathname === '/LUYViewer_logo.png') {
    return serveBinaryFile('./LUYViewer_logo.png', 'image/png;');
  }

  // Serve index.html for root path and any other paths
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStaticFile('./index.html', 'text/html; charset=utf-8');
  }

  // For any other path, return 404 instead of defaulting to index.html
  return new Response(labels.main_error_not_found || "Not found", { status: 404 });
}

async function main() {
  await loadLabels();
  
  console.log(`🦕 ${labels.main_info_starting_application || "Starting the application..."}`);
  console.log(`🌐 ${labels.main_info_application_available || "The application will be available at"} http://${config.server.hostname}:${config.server.port}`);
  
  const server = Deno.serve({
    hostname: config.server.hostname,
    port: config.server.port,
  }, handler);
  
  console.log(`🚀 ${labels.main_info_open_browser || "Open"} http://${config.server.hostname}:${config.server.port} ${labels.main_info_in_browser || "in your browser to use the application"}`);
  console.log(`🔒 ${labels.main_info_local_access_only || "Access works only locally, not from another computer."}`);
  
  // Graceful shutdown
  const signals = ["SIGINT", "SIGTERM"] as const;
  for (const signal of signals) {
    Deno.addSignalListener(signal, () => {
      console.log(`\n📪 ${labels.main_info_stopping_application || "Stopping the application due to"} ${signal}...`);
      server.shutdown();
      Deno.exit(0);
    });
  }
}

if (import.meta.main) {
  main();
}