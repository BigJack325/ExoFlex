import {
  Drawer,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  useTheme
} from "@mui/material";
import {
  ArrowBack,
  ArrowForward,
  ArrowUpward,
  ArrowDownward,
  Compress,
  Expand,
} from "@mui/icons-material";

import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";
import Button from "./Button.tsx";
import { stm32DataType } from "../hooks/use-stm32.ts";
import { useEffect } from "react";
import { tokens } from "../hooks/theme";

interface ManualControlProps {
  errorFromStm32: boolean;
  stm32Data: stm32DataType | null;
}

const ManualControl = ({ errorFromStm32, stm32Data }: ManualControlProps) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isManualControlOpen, setIsManualControlOpen] = useState(false);
  const buttonMode = "Manual";
  const action = "Increment";
  const [changeSideDisabled, setChangeSideDisable] = useState(true);

  useEffect(() => {
    if (stm32Data?.Mode == "Automatic") {
      if (
        stm32Data.AutoState == "Ready" ||
        stm32Data.AutoState == "WaitingForPlan"
      ) {
        setChangeSideDisable(false);
      } else {
        setChangeSideDisable(true);
      }
    } else if (stm32Data?.Mode == "ChangeSide") {
      setChangeSideDisable(true);
    } else if (stm32Data?.Mode == "Manual") {
      setChangeSideDisable(false);
    }
  }, [stm32Data?.AutoState, stm32Data?.Mode]);

  return (
    <Box
      sx={{ justifyContent: "center", display: "flex", marginY: "10px" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <IconButton
            onClick={() => setIsManualControlOpen(!isManualControlOpen)}
            sx={{
              backgroundColor: "blueAccent.main",
              "&:hover": {
                backgroundColor: "#1D4ED8",
              },
            }}
          >
            <KeyboardArrowUpIcon />
          </IconButton>
        </Box>
        <Typography>Manual Control</Typography>
      </Box>
      <Drawer
        anchor="bottom"
        variant="persistent"
        open={isManualControlOpen}
        onClose={() => setIsManualControlOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
            maxHeight: "80vh",
          },
        }}
      >
        <Box
          sx={{
            p: 1,
            background: `linear-gradient(45deg, ${colors.primary[400]} 5%, #140f80 90%)`,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <IconButton
              onClick={() => setIsManualControlOpen(!isManualControlOpen)}
              sx={{
                backgroundColor: "blueAccent.main",
                "&:hover": {
                  backgroundColor: "#1D4ED8",
                },
              }}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
          </Box>
          <Grid container wrap="nowrap" spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ background: "#141b2d" }}>
                <CardContent
                  sx={{
                    "&.MuiCardContent-root:last-child" : {
                      padding: "5px"
                    },
                    height: "120px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography noWrap variant="button">
                    Anatomical Movement
                  </Typography>
                  <Box
                    sx={{
                      flexGrow: 1,
                      alignContent: "center",
                      flexDirection: "column",
                    }}
                  >
                    <Grid container >
                      <Grid item xs={4}>
                        <Typography
                          sx={{ justifyContent: "center", display: "flex" }}
                          variant="subtitle1"
                        >
                          Eversion
                        </Typography>
                        <Box
                          sx={{
                            justifyContent: "center",
                            display: "flex",
                            gap: "40px",
                          }}
                        >
                          <Button
                            mode={buttonMode}
                            action={action}
                            content={
                              stm32Data?.CurrentLegSide == "LegIsLeft"
                                ? "EversionO"
                                : "EversionI"
                            }
                            mainColor="blueAccent.main"
                            hoverColor="#1D4ED8"
                            textColor="text-white"
                            disabled={errorFromStm32 || changeSideDisabled}
                            icon={<ArrowBack />}
                          />

                          <Button
                            mode={buttonMode}
                            action={action}
                            content={
                              stm32Data?.CurrentLegSide == "LegIsLeft"
                                ? "EversionI"
                                : "EversionO"
                            }
                            mainColor="blueAccent.main"
                            hoverColor="#1D4ED8"
                            textColor="text-white"
                            disabled={errorFromStm32 || changeSideDisabled}
                            icon={<ArrowForward />}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography
                          sx={{ justifyContent: "center", display: "flex" }}
                          variant="subtitle1"
                        >
                          Dorsiflexion
                        </Typography>
                        <Box
                          sx={{
                            justifyContent: "center",
                            display: "flex",
                            gap: "40px",
                          }}
                        >
                          <Button
                            mode={buttonMode}
                            action={action}
                            content="DorsiflexionU"
                            mainColor="blueAccent.main"
                            hoverColor="#1D4ED8"
                            textColor="text-white"
                            disabled={errorFromStm32 || changeSideDisabled}
                            icon={<ArrowUpward />}
                          />
                          <Button
                            mode={buttonMode}
                            action={action}
                            content="DorsiflexionD"
                            mainColor="blueAccent.main"
                            hoverColor="#1D4ED8"
                            textColor="text-white"
                            disabled={errorFromStm32 || changeSideDisabled}
                            icon={<ArrowDownward />}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={4} sx={{ justifyItems: "center" }}>
                        <Typography
                          sx={{ justifyContent: "center", display: "flex" }}
                          variant="subtitle1"
                        >
                          Extension
                        </Typography>
                        <Box
                          sx={{
                            justifyContent: "center",
                            display: "flex",
                            gap: "40px",
                          }}
                        >
                          <Button
                            mode={buttonMode}
                            action={action}
                            content="ExtensionU"
                            mainColor="blueAccent.main"
                            hoverColor="#1D4ED8"
                            textColor="text-white"
                            disabled={errorFromStm32 || changeSideDisabled}
                            icon={<ArrowUpward />}
                          />
                          <Button
                            mode={buttonMode}
                            action={action}
                            content="ExtensionD"
                            mainColor="blueAccent.main"
                            hoverColor="#1D4ED8"
                            textColor="text-white"
                            disabled={errorFromStm32 || changeSideDisabled}
                            icon={<ArrowDownward />}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: "#141b2d" }}>
                <CardContent
                  sx={{
                    height: "120px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography variant="button" gutterBottom>
                    Foot Fastening
                  </Typography>
                  <Box
                    sx={{
                      flexGrow: 1,
                      alignContent: "center",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        justifyContent: "center",
                        display: "flex",
                        gap: "40px",
                      }}
                    >
                      <Button
                        mode={buttonMode}
                        action="Tightening"
                        content="Forward"
                        mainColor="blueAccent.main"
                        hoverColor="#1D4ED8"
                        textColor="text-white"
                        disabled={errorFromStm32 || changeSideDisabled}
                        icon={<Compress />}
                      />
                      <Button
                        mode={buttonMode}
                        action="Tightening"
                        content="Backward"
                        mainColor="blueAccent.main"
                        hoverColor="#1D4ED8"
                        textColor="text-white"
                        disabled={errorFromStm32 || changeSideDisabled}
                        icon={<Expand />}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: "#141b2d" }}>
                <CardContent
                  sx={{
                    height: "120px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography variant="button" gutterBottom>
                    Switch Side
                  </Typography>
                  <Box
                    sx={{
                      flexGrow: 1,
                      alignContent: "center",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        justifyContent: "center",
                        display: "flex",
                        gap: "40px",
                      }}
                    >
                      <Button
                        mode="ChangeSide"
                        mainColor={
                          stm32Data?.CurrentLegSide == "LegIsRight"
                            ? "blueAccent.main"
                            : ""
                        }
                        hoverColor={
                          stm32Data?.CurrentLegSide == "LegIsRight"
                            ? "#1D4ED8"
                            : ""
                        }
                        textColor={"text-white"}
                        disabled={
                          changeSideDisabled ||
                          errorFromStm32 ||
                          stm32Data?.CurrentLegSide == "LegIsLeft"
                        }
                        icon={<ArrowBack />}
                      />
                      <Button
                        mode="ChangeSide"
                        mainColor={
                          stm32Data?.CurrentLegSide == "LegIsLeft"
                            ? "blueAccent.main"
                            : ""
                        }
                        hoverColor={
                          stm32Data?.CurrentLegSide == "LegIsLeft"
                            ? "#1D4ED8"
                            : ""
                        }
                        textColor={"text-white"}
                        disabled={
                          changeSideDisabled ||
                          errorFromStm32 ||
                          stm32Data?.CurrentLegSide == "LegIsRight"
                        }
                        icon={<ArrowForward />}
                      />
                    </Box>
                    {stm32Data?.Mode == "ChangeSide" && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: "20px",
                          justifyContent: "center",
                        }}
                      >
                        <CircularProgress color="secondary" />
                        <Typography
                          variant="subtitle1"
                          sx={{ alignContent: "center" }}
                        >
                          Changing side
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ManualControl;
