import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import supaClient from "../utils/supabaseClient.ts";
import { validationResult } from "express-validator";
import { CookieOptions } from "express";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: "/",
};

export const signup = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ session_status: "inactive", errors: errors.array() });
  }

  const { email, password, first_name, last_name, phone_number, permissions } = req.body;

  try {
    // Check if the user already exists
    const { data: existingUser } = await supaClient
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res
        .status(400)
        .json({ session_status: "inactive", error: "User with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Sign up the user in Supabase Auth
    const { data: newUserProfile, error: authInsertError } = await supaClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: first_name,
          last_name: last_name,
          phone_number: phone_number,
          permissions: permissions,
        },
      },
    });

    if (authInsertError) {
      return res.status(400).json({ session_status: "inactive", error: authInsertError.message });
    }

    const newUserUUID = newUserProfile.user.id;

    // Insert user profile in the database
    const { error: profileInsertError } = await supaClient
      .from("user_profiles")
      .insert([
        {
          user_id: newUserUUID,
          first_name: first_name,
          last_name: last_name,
          phone_number: phone_number,
          permissions: permissions,
          email: email,
          password: hashedPassword,
        },
      ])
      .single();

    if (profileInsertError) {
      return res.status(400).json({ session_status: "inactive", error: profileInsertError.message });
    }

    // Set the access_token and refresh_token in cookies if session exists
    if (newUserProfile.session) {
      res.cookie("access_token", newUserProfile.session.access_token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60, // 1 hour
      });

      res.cookie("refresh_token", newUserProfile.session.refresh_token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });

      // Return session_status as active and include user data
      return res.status(201).json({ session_status: "active", user: newUserProfile.user });
    } else {
      // If no session, return session_status as inactive
      return res.status(201).json({ session_status: "inactive", user: newUserProfile.user });
    }
  } catch (err: any) {
    return res.status(500).json({ session_status: "inactive", error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ session_status: "inactive", errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const { data: supabaseUser, error } = await supaClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error || !supabaseUser.session) {
      return res.status(401).json({
        session_status: "inactive",
        error: error ? error.message : "Login failed",
      });
    }

    // Set the access_token and refresh_token in cookies
    res.cookie("access_token", supabaseUser.session.access_token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60, // 1 hour
    });

    res.cookie("refresh_token", supabaseUser.session.refresh_token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    // Return session_status as active and include user data
    return res.status(200).json({ session_status: "active", user: supabaseUser.user });
  } catch (err: any) {
    return res.status(500).json({ session_status: "inactive", error: err.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ session_status: "inactive", error: "User ID is required" });
    }

    const { error: updateError } = await supaClient
      .from("user_profiles")
      .update({ fcm_token: null })
      .eq("user_id", user_id);

    if (updateError) {
      return res.status(500).json({
        session_status: "inactive",
        error: `Failed to remove FCM token: ${updateError.message}`,
      });
    }

    const { error } = await supaClient.auth.signOut();
    if (error) {
      return res.status(500).json({ session_status: "inactive", error: error.message });
    }

    // Clear cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });

    // Return session_status as inactive
    return res.status(200).json({ session_status: "inactive", logout: true });
  } catch (err: any) {
    return res.status(500).json({ session_status: "inactive", error: err.message });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supaClient.auth.getSession();

    if (data?.session) {
      // Session is active
      return res.status(200).json({
        session_status: "active",
        user: data.session.user,
        message: "Session is active",
      });
    }

    // Attempt to refresh session
    const refreshToken = req.cookies["refresh_token"];

    if (!refreshToken) {
      return res.status(401).json({ session_status: "inactive", error: "No refresh token available" });
    }

    // Use fetch to refresh the session
    const response = await fetch(
      `${process.env.SUPABASE_API_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }
    );

    const tokenData = await response.json();

    if (tokenData.access_token) {
      // Set the new tokens in cookies
      res.cookie("access_token", tokenData.access_token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60, // 1 hour
      });

      res.cookie("refresh_token", tokenData.refresh_token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });

      // Set the session using Supabase client
      const { data: sessionData, error: sessionError } = await supaClient.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });

      if (sessionError || !sessionData.session) {
        return res.status(401).json({
          session_status: "inactive",
          error: "Unable to set session",
          details: sessionError?.message,
        });
      }

      // Return session_status as active and include user data
      return res.status(200).json({
        session_status: "active",
        user: sessionData.session.user,
        message: "Session refreshed successfully",
      });
    } else {
      return res.status(401).json({
        session_status: "inactive",
        error: "Unable to refresh session",
        details: tokenData.error_description || tokenData.error,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ session_status: "inactive", error: err.message });
  }
};
