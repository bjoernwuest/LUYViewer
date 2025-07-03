import { parse } from "@std/jsonc";
import { walk } from "https://deno.land/std@0.203.0/fs/walk.ts";

interface Config {
  server: {
    port: number;
    hostname: string;
  };
  app: {
    luy_host: string;
  };
}

async function loadConfig(): Promise<Config> {
  try {
    const configText = await Deno.readTextFile("./config.json");
    return parse(configText) as unknown as Config;
  } catch (error) {
    console.error("Konnte config.json nicht laden, fahre mit Standardkonfiguration fort:", error);
    // Return default configuration
    return {
      server: {
        port: 8080,
        hostname: "localhost"
      },
      app: {
        luy_host: "https://luy.eam.elli.eco"
      }
    };
  }
}

async function serveStaticFile(filePath: string, contentType: string): Promise<Response> {
  try {
    const content = await Deno.readTextFile(filePath);
    return new Response(content, {
      headers: { "content-type": contentType },
    });
  } catch (error) {
    console.error(`Fehler die Datei ${filePath} auszuliefern:`, error);
    return new Response("Datei nicht gefunden", { status: 404 });
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
    console.error("Fehler beim lesen der Daten:", error);
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
      return new Response(JSON.stringify({ error: 'Konnte Daten nicht laden' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Die gewünschte Funktion kann nicht ausgeführt werden', { status: 405 });
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
    console.error(`Error loading dataset for ${timestamp}:`, error);
    return new Response(JSON.stringify({ error: 'Datensatz konnte nicht geladen werden' }), {
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
      return new Response(JSON.stringify({ error: 'Benutzername und Passwort sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Load config to get luy_host
    const config = await loadConfig();
    const luyHost = config.app.luy_host;
    
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
      console.log(`Lade Metamodel von ${metamodelUrl} herunter`);
      
      const metamodelResponse = await fetch(metamodelUrl, {
        method: 'GET',
        headers: authHeaders
      });
      
      if (!metamodelResponse.ok) {
        throw new Error(`Konnte Metamodel nicht herunterladen: ${metamodelResponse.status} ${metamodelResponse.statusText}`);
      }
      
      const metamodelData = await metamodelResponse.text();
      const metamodelFilePath = `./data/${timestamp}_metamodel.json`;
      await Deno.writeTextFile(metamodelFilePath, metamodelData);
      console.log(`Metamodel gespeichert in: ${metamodelFilePath}`);
      
      // Download data document
      const dataUrl = `${luyHost}/api/data`;
      console.log(`Lade Daten von ${dataUrl} herunter`);
      
      const dataResponse = await fetch(dataUrl, {
        method: 'GET',
        headers: authHeaders
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Konnte Daten nicht herunterladen: ${dataResponse.status} ${dataResponse.statusText}`);
      }
      
      const dataText = await dataResponse.text();
      const dataFilePath = `./data/${timestamp}_data.json`;
      await Deno.writeTextFile(dataFilePath, dataText);
      console.log(`Daten gespeichert in: ${dataFilePath}`);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Daten erfolgreich heruntergeladen',
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
      console.error('Download-Fehler:', downloadError);
      return new Response(JSON.stringify({ 
        error: 'Konnte die Daten nicht laden.',
        details: downloadError instanceof Error ? (downloadError.message || 'Unknown error') : String(downloadError)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('Fehler beim Download der Daten:', error);
    return new Response(JSON.stringify({ error: 'Ungültiges Abfrageformat' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Security: Only allow localhost
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return new Response("Verboten: Sie können nur vom lokalen Rechner zugreifen", {
      status: 403 
    });
  }

  // Handle API endpoints
  if (url.pathname === '/api/data-files') {
    return handleDataFilesRequest(request);
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

  // Serve index.html for root path and any other paths
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStaticFile('./index.html', 'text/html; charset=utf-8');
  }

  // For any other path, return 404 instead of defaulting to index.html
  return new Response("Nicht gefunden", { status: 404 });
}

async function main() {
  const config = await loadConfig();
  
  console.log(`🦕 Starte die Anwendung...`);
  console.log(`🌐 Die Anwendung wird über http://${config.server.hostname}:${config.server.port} abrufbar sein.`);
  
  const server = Deno.serve({
    hostname: config.server.hostname,
    port: config.server.port,
  }, handler);
  
  console.log(`🚀 Öffnen Sie http://${config.server.hostname}:${config.server.port} im Browser, um die Anwendung zu nutzen`);
  console.log(`🔒 Der Zugriff funktioniert nur lokal, nicht von einem anderen Computer.`);
  
  // Graceful shutdown
  const signals = ["SIGINT", "SIGTERM"] as const;
  for (const signal of signals) {
    Deno.addSignalListener(signal, () => {
      console.log(`\n📪 Stoppe die Anwendung auf Grund von ${signal}...`);
      server.shutdown();
      Deno.exit(0);
    });
  }
}

if (import.meta.main) {
  main().catch(console.error);
}