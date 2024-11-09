import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  CircularProgress,
  type CircularProgressProps,
  Typography,
  LinearProgress,
} from "@mui/material";

function CircularProgressWithLabel(
  props: CircularProgressProps & { value: number },
) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        size="9.375rem"
        variant="determinate"
        color="success"
        {...props}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color="black"
          fontSize={30}
        >{`${Math.min(Math.round(props.value), 100)}%`}</Typography>
      </Box>
    </Box>
  );
}

interface Props {
  stm32Data: any | null;
  planData: any;
  setOpenDialogPainScale: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ProgressionWidget({
  stm32Data,
  planData,
  setOpenDialogPainScale,
}: Props) {
  const [stretchProgress, setStretchProgress] = useState(0);
  const [repetitionProgress, setRepetitionProgress] = useState(0);
  const [totalRepetition, setTotalRepetition] = useState(-1);

  useEffect(() => {
    let stretchDone = 0;
    for (let i = stm32Data?.ExerciseIdx - 1; i > -1; i--) {
      stretchDone = stretchDone + planData.plan[i].repetitions;
    }
    setStretchProgress(stretchDone);
  }, [stm32Data?.ExerciseIdx]);

  useEffect(() => {
    if (stm32Data?.AutoState === "Resting") {
      setStretchProgress(stretchProgress + 1);
    }
  }, [stm32Data?.AutoState]);

  // Memoize totalStretch calculation
  const totalStretch = useMemo(() => {
    console.log(planData);
    if (!planData?.plan) return 1;
    return planData.plan.reduce((total: number, exercise: any) => {
      return total + (exercise?.repetitions || 0);
    }, 0);
  }, [planData]);

  useEffect(() => {
    if (stm32Data?.Repetitions !== undefined) {
      setRepetitionProgress(stm32Data.Repetitions);

      // Open pain scale dialog if repetitions are complete
      if (stretchProgress === totalStretch) {
        setOpenDialogPainScale(true);
        setStretchProgress(0);
      }
    }
  }, [stm32Data?.Repetitions, totalRepetition, setOpenDialogPainScale]);

  useEffect(() => {
    if (planData && stm32Data?.ExerciseIdx !== undefined) {
      if (planData.plan[stm32Data.ExerciseIdx]?.repetitions) {
        const repetitions = planData.plan[stm32Data.ExerciseIdx]?.repetitions;
        setTotalRepetition(repetitions);
      } else {
        setTotalRepetition(0);
      }
    }
  }, [planData, stm32Data?.ExerciseIdx]);

  return (
    <div className="">
      <div className="flex justify-center mb-2.5">
        <CircularProgressWithLabel
          value={(stretchProgress / totalStretch) * 100 || 0}
        />
      </div>
      <Typography
        fontSize={"20px"}
        sx={{
          color: "black",
          justifyContent: "center",
          display: "flex",
          marginBottom: "28px",
        }}
      >
        Session Progress
      </Typography>
      <Typography
        fontSize={"20px"}
        sx={{ color: "black", justifyContent: "center", display: "flex" }}
      >
        {repetitionProgress + "/" + totalRepetition}
      </Typography>
      <div className="flex justify-center mb-1">
        <Box sx={{ width: "75%" }}>
          <LinearProgress
            color="success"
            variant="determinate"
            value={(repetitionProgress / totalRepetition) * 100 || 0}
          />
        </Box>
      </div>
      <Typography
        sx={{ color: "black", justifyContent: "center", display: "flex" }}
      >
        Repetitions Progress
      </Typography>
    </div>
  );
}
