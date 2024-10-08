import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import supaClient from "../utils/supabaseClient";
import { PostPlanRequestBody } from "../interfaces/Plan";

const postPlan = asyncHandler(async (req: Request, res: Response) => {
  const { plan, user_id }: PostPlanRequestBody = req.body;

  if (!plan || !user_id) {
    return res.status(400).json({ message: "Plan and user_id are required." });
  }

  try {
    const { data, error } = await supaClient
      .from("plans")
      .insert([
        {
          user_id,
          plan,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Error sending plan:", error);
      return res
        .status(500)
        .json({ message: "Error sending plan", error: error.message });
    }

    console.log("Success sending plan:", data);
    return res.status(200).json({ message: "Success sending plan", data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ message: "Unexpected error occurred." });
  }
});

const getPlan = asyncHandler(async (req: Request, res: Response) => {
  const user_id = req.params.userId;

  // Input Validation
  if (!user_id) {
    return res
      .status(400)
      .json({ message: "User ID is required.", data: null });
  }

  try {
    // Fetch the latest plan from the 'plans' table
    const { data, error } = await supaClient
      .from("plans")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .single();

    // Handle error scenarios
    if (error) {
      // Check if the error code is PGRST116 or any other relevant code indicating a "Not Found" error
      if (error.code === "PGRST116") {
        console.warn(`Plan not found for user_id: ${user_id}`);
        return res
          .status(404)
          .json({ message: "No plan found for this user.", data: null });
      }

      console.error("Error getting plan:", error);
      return res
        .status(500)
        .json({ message: "Error getting plan", error: error.message });
    }

    return res.status(200).json({ plan: data.plan });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ message: "Unexpected error occurred." });
  }
});

export { postPlan, getPlan };
