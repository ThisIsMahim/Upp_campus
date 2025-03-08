import { supabase } from "./supabase"

export async function checkCampusSetup() {
  try {
    console.log("Checking campus setup...")

    // Check if campuses table exists and has data
    const { data, error } = await supabase.from("campuses").select("count")

    if (error) {
      console.error("Error checking campuses table:", error)
      return false
    }

    // If no campuses exist, create the default MEC campus
    if (!data || data.length === 0) {
      console.log("No campuses found, creating default MEC campus...")

      const { error: insertError } = await supabase.from("campuses").insert([
        {
          name: "Mymensingh Engineering College",
          short_name: "MEC",
          description: "The main campus of Mymensingh Engineering College",
        },
      ])  

      if (insertError) {
        console.error("Error creating default campus:", insertError)
        return false
      }

      console.log("Default MEC campus created successfully")
    } else {
      console.log("Campuses table exists and has data")
    }

    return true
  } catch (error) {
    console.error("Unexpected error checking campus setup:", error)
    return false
  }
}

