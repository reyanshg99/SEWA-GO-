import { supabase } from "../lib/supabase";

export async function signUpCustomer({
  name,
  email,
  password,
  phone,
}: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone ?? "",
        role: "customer",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWorker({
  name,
  email,
  password,
  phone,
}: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone ?? "",
        role: "worker",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInCustomer(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "customer") {
    await supabase.auth.signOut();
    throw new Error("This account is not registered as a customer.");
  }

  return data;
}

export async function signInWorker(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "worker") {
    await supabase.auth.signOut();
    throw new Error("This account is not registered as a service professional.");
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
