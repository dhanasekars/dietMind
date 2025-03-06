import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.json({ status: "Service is up and running" });
});

app.post("/generate-meal-plan", async (req, res) => {
  try {
    const { dietaryPreference, allergies, ageStage, medicalConditions, activityLevel } = req.body;

    const prompt = `Generate two Indian dishes each for breakfast, lunch, and dinner based on the following user information:
    - Dietary Preference: ${dietaryPreference}
    - Allergies: ${allergies.length > 0 ? allergies.join(", ") : "None"}
    - Age Stage: ${ageStage}
    - Medical Conditions: ${medicalConditions.length > 0 ? medicalConditions.join(", ") : "None"}
    - Activity Level: ${activityLevel}
    Also, provide health benefits for each dish, along with three recommended foods and three foods to avoid.
    Format the response in markdown as follows:
    ## Breakfast
    - Dish 1: Dish Name
      - Health Benefit 1
      - Health Benefit 2
      - Health Benefit 3
    - Dish 2: Dish Name
      - Health Benefit 1
      - Health Benefit 2
      - Health Benefit 3
    ## Lunch
    - Dish 1: Dish Name
      - Health Benefit 1
      - Health Benefit 2
      - Health Benefit 3
    - Dish 2: Dish Name
      - Health Benefit 1
      - Health Benefit 2
      - Health Benefit 3
    ## Dinner
    - Dish 1: Dish Name
      - Health Benefit 1
      - Health Benefit 2
      - Health Benefit 3
    - Dish 2: Dish Name
      - Health Benefit 1
      - Health Benefit 2
      - Health Benefit 3
    ## Recommended Foods
    - Food 1
    - Food 2
    - Food 3
    ## Foods to Avoid
    - Food 1
    - Food 2
    - Food 3`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const mealPlan = response.choices[0].message.content;
    const parsedMealPlan = parseMealPlan(mealPlan);
    res.json(parsedMealPlan);
  } catch (error) {
    console.error("Error generating meal plan:", error);
    res.status(500).json({ error: "Failed to generate meal plan" });
  }
});

const parseMealPlan = (mealPlan) => {
  const sections = mealPlan.split("##").map(section => section.trim()).filter(section => section);
  const result = {};

  sections.forEach(section => {
    const lines = section.split("\n").map(line => line.trim()).filter(line => line);
    const sectionTitle = lines.shift();

    if (sectionTitle.startsWith("Breakfast") || sectionTitle.startsWith("Lunch") || sectionTitle.startsWith("Dinner")) {
      result[sectionTitle] = [];
      let currentDish = null;

      lines.forEach(line => {
        if (line.startsWith("- Dish")) {
          if (currentDish) {
            result[sectionTitle].push(currentDish);
          }
          currentDish = { name: line.split(": ")[1], benefits: [] };
        } else if (line.startsWith("-")) {
          currentDish.benefits.push(line.slice(2));
        }
      });

      if (currentDish) {
        result[sectionTitle].push(currentDish);
      }
    } else if (sectionTitle.startsWith("Recommended Foods") || sectionTitle.startsWith("Foods to Avoid")) {
      result[sectionTitle] = lines.map(line => line.slice(2));
    }
  });

  return result;
};

const PORT = process.env.PORT || 5001;

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));