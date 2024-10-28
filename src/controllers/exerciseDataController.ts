import supaClient from "../utils/supabaseClient.ts";

export const getExerciseData = async (req, res) => {
  const { userId } = req.params;
  const { start_date, end_date } = req.query;

  if (!userId || !start_date || !end_date) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const { data, error } = await supaClient
      .from("exercise_data")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", start_date)
      .lte("created_at", end_date)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getExerciseDataById = async (req, res) => {
  const { exerciseId } = req.params;

  if (!exerciseId) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: exerciseId" });
  }

  try {
    const { data, error } = await supaClient
      .from("exercise_data")
      .select("*")
      .eq("id", exerciseId)
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "Exercise data not found" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const postExerciseData = async (req, res) => {
  const { date, user_id, rated_pain } = req.body;

  const { error } = await supaClient.from("exercise_data").insert({
    date,
    rated_pain,
    user_id,
  });

  if (error) {
    return res.status(500).json({
      message: "Failed to send exercise data",
      error: error.message,
    });
  }

  return res
    .status(200)
    .json({ success: true, message: "Exercise data sent successfully" });
};
