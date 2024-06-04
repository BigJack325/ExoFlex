import express, { Application, Request, Response, NextFunction } from "express";
import { SerialPort } from "serialport";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { supaClient } from "./hooks/supa-client.ts";
import dotenv from "dotenv";
import { checkPermission } from './middleware/checkPermission.tsx'

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:1337",
    methods: ["GET", "POST"],
  },
});

let serialPort: SerialPort | null = null;
let receivedDataBuffer: string = "";

app.use(express.json());
app.use(cors());

/*
..######..########.########..####....###....##..........########...#######..########..########
.##....##.##.......##.....##..##....##.##...##..........##.....##.##.....##.##.....##....##...
.##.......##.......##.....##..##...##...##..##..........##.....##.##.....##.##.....##....##...
..######..######...########...##..##.....##.##..........########..##.....##.########.....##...
.......##.##.......##...##....##..#########.##..........##........##.....##.##...##......##...
.##....##.##.......##....##...##..##.....##.##..........##........##.....##.##....##.....##...
..######..########.##.....##.####.##.....##.########....##.........#######..##.....##....##...
*/

app.post("/initialize-serial-port", (_, res) => {
  if (serialPort && serialPort.isOpen) {
    console.log("Serial port already initialized.");
    res.status(200).send("Serial port already initialized.");
    return;
  }

  SerialPort.list().then((ports) => {
    const scannerPort = ports.find(
      (serialPort) => serialPort.manufacturer === "STMicroelectronics",
    );

    if (scannerPort) {
      console.log("Scanner port:", scannerPort.path);
      if (!serialPort || !serialPort.isOpen) {
        serialPort = new SerialPort({
          path: scannerPort.path,
          baudRate: 115200,
        });

        serialPort.on("error", (error) => {
          console.log("Serial port error:", error.message);
          // io.emit("serialPortClosed", "Serial port error");
          // serialPort = null;
        });

        serialPort.on("close", () => {
          console.log("Serial port closed");
          io.emit("serialPortClosed", "Serial port closed");
          serialPort = null;
        });

        serialPort.on("open", () => {
          console.log("Serial port opened.");
          res.status(200).send("Serial port initialized and ready.");
        });

        serialPort.on("data", (data) => {
          receivedDataBuffer += data.toString();

          // Check if the received data forms a valid JSON
          for (let i = 0; i < receivedDataBuffer.length; i++) {
            if (receivedDataBuffer[i] === "{") {
              receivedDataBuffer = receivedDataBuffer.slice(i);
            } else if (receivedDataBuffer[i] === "}") {
              const jsonDataString = receivedDataBuffer.substring(0, i + 1);
              try {
                io.emit("stm32Data", JSON.parse(jsonDataString));
              } catch (err) {
                console.error("Error parsing JSON", err);
              }
              // Reset buffer and readingJson flag
              receivedDataBuffer = receivedDataBuffer.slice(i + 1);
            }
          }
        });
      } else {
        console.log("Serial port already initialized.");
        res.status(200).send("Serial port already initialized.");
      }
    } else {
      serialPort = null;
      console.error("No scanner port found.");
      res.status(500).send("No scanner port found.");
    }
  });
});

/*
..######..########.##.....##..#######...#######.
.##....##....##....###...###.##.....##.##.....##
.##..........##....####.####........##........##
..######.....##....##.###.##..#######...#######.
.......##....##....##.....##........##.##.......
.##....##....##....##.....##.##.....##.##.......
..######.....##....##.....##..#######..#########
*/

io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("planData", (planData) => {
    if (serialPort && serialPort.isOpen) {
      serialPort.write(planData, (err) => {
        if (err) {
          console.error("Error writing to serial port:", err);
        } else {
          console.log("Data sent to serial port:", planData);
        }
      });
    }
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

app.post("/hmi-button-click", (req, res) => {
  const { mode, action, content } = req.body;
  console.log(`Button clicked:{${mode};${action};${content};}`);

  const dataToSend = `{${mode};${action};${content};}`;
  if (serialPort && serialPort.isOpen) {
    serialPort.write(dataToSend, (err) => {
      if (err) {
        console.error("Error writing to serial port:", err);
        res.status(500).send("Serial Error");
      } else {
        console.log("Data sent to serial port:", dataToSend);
        res.status(200).send("Data sent to serial port.");
      }
    });
  }
});

/*
..######..##.....##.########.....###....########.....###.....######..########.....######..########.########..##.....##.########.########.
.##....##.##.....##.##.....##...##.##...##.....##...##.##...##....##.##..........##....##.##.......##.....##.##.....##.##.......##.....##
.##.......##.....##.##.....##..##...##..##.....##..##...##..##.......##..........##.......##.......##.....##.##.....##.##.......##.....##
..######..##.....##.########..##.....##.########..##.....##..######..######.......######..######...########..##.....##.######...########.
.......##.##.....##.##........#########.##.....##.#########.......##.##................##.##.......##...##....##...##..##.......##...##..
.##....##.##.....##.##........##.....##.##.....##.##.....##.##....##.##..........##....##.##.......##....##....##.##...##.......##....##.
..######...#######..##........##.....##.########..##.....##..######..########.....######..########.##.....##....###....########.##.....##
*/

// Middleware to check if session is lost
async function checkSession(_: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await supaClient.auth.getSession();

    const access_token = data.session?.access_token;
    const refresh_token = data.session?.refresh_token;

    if (!access_token || !refresh_token) {
      // Session is lost, handle it here
      console.error("Session lost", error);
      res.status(401).json({ error: "Session lost" });
    } else {
      next();
    }
  } catch (error) {
    console.error("Error checking session:", error);
    res.status(500).json({ error: "Error checking session" });
  }
}

app.post("/push-plan-supabase", checkSession, checkPermission(['admin', 'dev']), async (req, res) => {
  try {
    const { plan } = req.body;
    const {
      data: { user },
    } = await supaClient.auth.getUser();
    const { data, error } = await supaClient.rpc("push_planning", {
      user_id: user?.id,
      new_plan: plan,
    });

    if (error) {
      console.error(`Error sending plan:`, error);
      res.status(500).send("Error sending plan");
      return;
    } else {
      console.log(`Success sending plan:`, data);
      res.status(200).send("Success sending plan");
    }
  } catch (err) {
    console.error("Error sending plan:", err);
    res.status(500).send("Error sending plan");
  }
});

app.post("/assign_admin_to_client", checkSession, checkPermission(['admin', 'dev']), async (req, res) => {
  try {
    const { admin_id, client_id } = req.body;

    const { data, error } = await supaClient.rpc("assign_admin_to_client", {
      admin_id,
      client_id,
    });

    if (error) {
      console.error(`Error at creating relationship:`, error);
      res.status(500).json("Error creating relationship");
      return;
    } else {
      console.log(`Success creating relationship:`, data);
      res.status(200).json("Success creating relationship");
    }
  } catch (err) {
    console.error("Error creating relationship:", err);
    res.status(500).json("Error creating relationship");
  }
})

app.get("/get-plan", checkSession, checkPermission(['admin', 'dev']), async (_, res) => {
  try {
    const {
      data: { user },
    } = await supaClient.auth.getUser();

    const { data, error } = await supaClient.rpc("get_planning", {
      search_id: user?.id,
    });

    if (error) {
      console.error(`Error getting current plan:`, error);
      res.status(500).json({ error: "Error getting current plan" });
    } else {
      console.log(`Success getting current plan:`, data);
      res.status(200).json(data);
    }
  } catch (err) {
    console.error("Error getting current plan:", err);
    res.status(500).json({ error: "Error getting current plan" });
  }
});

app.get("/get_clients_for_admin", checkSession, checkPermission(['admin', 'dev']), async (_, res) => {
  try {
    const {
      data: {user},
      error: authError,
    } = await supaClient.auth.getUser();

    if (authError) {
      console.error("Error getting user:", authError);
      return res.status(500).json({ error: "Error getting user" });
    }

    if (!user?.id) {
      console.error("User is not authenticated or user ID is missing");
      return res.status(401).json({ error: "User is not authenticated" });
    }

    const {data, error} = await supaClient.rpc("get_clients_for_admin", {
      admin_id: user.id,
    });

    if (error) {
      console.error(`Error getting clients:`, error);
      res.status(500).json({ error: "Error getting clients" });
    }

    console.log(`Success getting clients:`, data);
    res.status(200).json(data);

  } catch (err) {
    console.error("Error getting clients:", err);
    res.status(500).json({ error: "Error getting clients" });
  }
})

/*
.##........#######...######.....###....##...........######..########.########..##.....##.########.########.
.##.......##.....##.##....##...##.##...##..........##....##.##.......##.....##.##.....##.##.......##.....##
.##.......##.....##.##........##...##..##..........##.......##.......##.....##.##.....##.##.......##.....##
.##.......##.....##.##.......##.....##.##...........######..######...########..##.....##.######...########.
.##.......##.....##.##.......#########.##................##.##.......##...##....##...##..##.......##...##..
.##.......##.....##.##....##.##.....##.##..........##....##.##.......##....##....##.##...##.......##....##.
.########..#######...######..##.....##.########.....######..########.##.....##....###....########.##.....##
*/

app.post("/setup-local-server", async (req, res) => {
  try {
    const access_token = req.body.access_token;
    const refresh_token = req.body.refresh_token;

    const {
      data: { session },
    } = await supaClient.auth.setSession({
      access_token,
      refresh_token,
    });

    if (session) {
      console.log("Local server setup successful.");
      res.status(200).send("Local server setup successful.");
    } else {
      res.status(401).json({ error: "Session not established" });
    }
  } catch (error) {
    console.error("Error setting up local server:", error);
    res.status(500).json({ error: "Error setting up local server" });
  }
});

/*
..######..########.########..##.....##.########.########......######..########.########.##.....##.########.
.##....##.##.......##.....##.##.....##.##.......##.....##....##....##.##..........##....##.....##.##.....##
.##.......##.......##.....##.##.....##.##.......##.....##....##.......##..........##....##.....##.##.....##
..######..######...########..##.....##.######...########......######..######......##....##.....##.########.
.......##.##.......##...##....##...##..##.......##...##............##.##..........##....##.....##.##.......
.##....##.##.......##....##....##.##...##.......##....##.....##....##.##..........##....##.....##.##.......
..######..########.##.....##....###....########.##.....##.....######..########....##.....#######..##.......
*/

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Close the serial port when the server is closed
process.on("SIGINT", () => {
  console.log("\n Server is shutting down...");
  // Close the serial port when the server is closed
  if (serialPort && serialPort.isOpen) {
    serialPort.close((err) => {
      if (err) {
        console.error("Error closing the port:", err.message);
      } else {
        console.log("Serial port closed.");
      }
    });
  }
  // Close the server
  httpServer.close(() => {
    console.log("\n Server closed.");
    process.exit(0);
  });
});
