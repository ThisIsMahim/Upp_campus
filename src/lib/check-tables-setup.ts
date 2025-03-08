import { supabase } from "./supabase"

export async function checkTablesSetup() {
  try {
    console.log("Checking database tables setup...")

    // Check if campuses table exists and has data
    const { data: campusesData, error: campusesError } = await supabase.from("campuses").select("count")

    if (campusesError) {
      console.error("Error checking campuses table:", campusesError)
      return false
    }

    // If no campuses exist, create the default MEC campus
    if (!campusesData || campusesData.length === 0) {
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

    // Check if posts table exists
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: postsData, error: postsError } = await supabase.from("posts").select("count").limit(1)

      if (postsError) {
        console.error("Error checking posts table:", postsError)
        console.log("Posts table may not exist or has incorrect structure")
        return false
      }

      console.log("Posts table exists and is accessible")
    } catch (error) {
      console.error("Unexpected error checking posts table:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Unexpected error checking tables setup:", error)
    return false
  }
}

