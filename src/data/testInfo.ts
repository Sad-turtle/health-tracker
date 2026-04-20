import type { TestInfo } from "../types";

export const TEST_INFO_DATABASE: Record<string, Omit<TestInfo, "test_name">> = {
  // === METABOLIC ===
  fasting_glucose: {
    short_description: "Measures blood sugar after fasting to detect prediabetes or diabetes.",
    detailed_info: "Fasting glucose measures the amount of sugar (glucose) in your blood after an overnight fast. It is a critical marker for metabolic health, insulin resistance, and diabetes risk. Persistently high levels indicate that your body is becoming less sensitive to insulin, whereas optimal levels show good metabolic flexibility."
  },
  hba1c: {
    short_description: "Average blood sugar levels over the past 2-3 months.",
    detailed_info: "Hemoglobin A1c (HbA1c) represents the percentage of hemoglobin in your red blood cells that is coated with sugar. Because red blood cells live for about 3 months, it provides a longer-term view of your blood sugar control compared to a single fasting glucose test. Lower levels generally correlate with slower biological aging and reduced risk of chronic diseases."
  },
  fasting_insulin: {
    short_description: "Amount of insulin required to maintain your resting blood sugar.",
    detailed_info: "Fasting insulin measures the background level of insulin your pancreas produces when you aren't eating. It is often an earlier indicator of metabolic dysfunction than fasting glucose; insulin will rise to compensate for insulin resistance long before glucose levels start to fail. Very low fasting insulin is a stellar marker of metabolic health."
  },
  triglycerides: {
    short_description: "Primary form of stored fat in the blood, highly sensitive to diet.",
    detailed_info: "Triglycerides are circulating fats largely derived from carbohydrates and dietary fats. High triglycerides are strongly associated with insulin resistance, metabolic syndrome, and cardiovascular disease. Lowering refined carbohydrates and alcohol intake, alongside exercise, rapidly reduces these levels."
  },

  // === CARDIOVASCULAR ===
  hdl_cholesterol: {
    short_description: "The 'good' cholesterol that carries lipids away from arteries.",
    detailed_info: "High-Density Lipoprotein (HDL) cholesterol helps clear cholesterol from your blood vessels and transports it to the liver for excretion. The absolute number matters, but its ratio to Triglycerides (TG:HDL ratio) is one of the most powerful predictors of cardiovascular and metabolic risk. Higher levels are predominantly achieved through exercise and fat profile improvements."
  },
  ldl_cholesterol: {
    short_description: "The 'bad' cholesterol associated with plaque buildup.",
    detailed_info: "Low-Density Lipoprotein (LDL) cholesterol is the primary carrier of cholesterol in the blood. While essential for building cells and hormones, high LDL concentrations are associated with atherosclerosis (plaque buildup) over decades. ApoB is actually a superior measurement, but LDL remains the standard clinical proxy."
  },
  apob: {
    short_description: "Direct count of all atherogenic (plaque-causing) particles.",
    detailed_info: "Apolipoprotein B (ApoB) is a protein attached to every single 'bad' cholesterol particle (LDL, VLDL, IDL). It tells us the total number of particles crashing around your bloodstream, which is a far more accurate predictor of heart disease risk than simply measuring the total cholesterol weight (LDL-C)."
  },
  lp_a: {
    short_description: "A highly genetic, particularly dangerous cardiovascular risk factor.",
    detailed_info: "Lipoprotein(a) is an LDL-like particle with an extra protein that makes it extra sticky and prone to building plaque and causing clots. Levels are roughly 90% determined by genetics and do not respond to typical lifestyle interventions. It only needs to be measured once in your life to establish your baseline genetic risk."
  },

  // === HORMONES ===
  testosterone_total: {
    short_description: "Total amount of primary male sex hormone in the blood.",
    detailed_info: "Total testosterone measures all of the hormone produced by your body, including what is bound to proteins (SHBG and albumin) and what is free. It drives muscle synthesis, libido, energy levels, and mood. It naturally declines with age, but stress, poor sleep, and poor body composition drastically accelerate this decline."
  },
  free_testosterone: {
    short_description: "The 'active' unplugged testosterone available for your cells.",
    detailed_info: "While Total Testosterone shows the overall pool, Free Testosterone measures only the ~2% that is not bound to proteins and can actually enter cells to exert effects. It is the most vital metric for men investigating symptoms of low drive or energy, as high SHBG can trap testosterone making total levels look deceptively normal."
  },
  estradiol: {
    short_description: "The primary active estrogen, crucial for bone health and mood.",
    detailed_info: "Estradiol (E2) is the most potent form of estrogen. In men, a small amount is produced by converting testosterone via the aromatase enzyme, which is critical for joint health, bone density, and libido. In women, it is the master hormone for the menstrual cycle and cardiovascular protection prior to menopause."
  },
  dhea_s: {
    short_description: "An adrenal hormone that is a precursor to testosterone and estrogen.",
    detailed_info: "Dehydroepiandrosterone sulfate (DHEA-S) is an androgen precursor produced heavily by the adrenal glands. It serves as an anti-aging marker because it peaks in our 20s and predictably crashes as we age. It buffers against the negative effects of cortisol (stress) and is a good snapshot of your adrenal reserve."
  },
  shbg: {
    short_description: "A protein that binds sex hormones, controlling their availability.",
    detailed_info: "Sex Hormone Binding Globulin (SHBG) is produced by the liver and binds tightly to testosterone and estrogen, preventing them from entering cells. High SHBG lowers your Free Testosterone but slows hormone clearance. Extremely low SHBG is often a sign of insulin resistance, while extremely high SHBG can cause low-testosterone symptoms."
  },
  tsh: {
    short_description: "Hormone that signals the thyroid gland to produce more hormones.",
    detailed_info: "Thyroid Stimulating Hormone (TSH) is pushed out by your brain's pituitary gland. Counter-intuitively, HIGH levels of TSH mean your brain is screaming at your thyroid because it thinks you don't have enough active thyroid hormone (Hypothyroidism). Low TSH means your thyroid is hyperactive."
  },
  free_t3: {
    short_description: "The active form of thyroid hormone driving your cellular metabolism.",
    detailed_info: "Triiodothyronine (Free T3) is the active gas-pedal for your metabolism. It is mostly converted from T4 in the liver and gut. If Free T3 is low, you will feel cold, sluggish, and struggle to lose weight, even if your TSH falls in the 'normal' range. It is highly sensitive to caloric restriction and stress."
  },

  // === INFLAMMATORY & BLOOD ===
  hs_crp: {
    short_description: "Highly sensitive marker of systemic inflammation.",
    detailed_info: "High-Sensitivity C-Reactive Protein (hs-CRP) is released by the liver when there is inflammation anywhere in the body. While a massive spike indicates acute illness or injury, chronic low-level elevation (above 1.0 mg/L) indicates a smoldering inflammatory fire that drastically increases the risk of heart disease."
  },
  ferritin: {
    short_description: "The protein that stores iron inside your cells.",
    detailed_info: "Ferritin represents your long-term iron reserves. Very low ferritin is the earliest indicator of iron deficiency before anemia begins. Conversely, because it is also an 'acute phase reactant', ferritin can spike purely due to systemic inflammation. Very high levels signify dangerous iron overload (hemochromatosis) which damages tissue."
  },
  homocysteine: {
    short_description: "An amino acid linked to vessel damage if B-vitamin cycles stall.",
    detailed_info: "Homocysteine is an intermediate byproduct of methionine metabolism. When the methylation cycle is slow—often due to B12, B6, Folate deficiencies, or MTHFR genetic mutations—homocysteine builds up in the blood. Elevated homocysteine is an independent risk marker for cardiovascular events and cognitive decline."
  },
  alt: {
    short_description: "A primary liver enzyme; high levels indicate liver distress.",
    detailed_info: "Alanine aminotransferase (ALT) is an enzyme found mostly in liver cells. When the liver is damaged by fat accumulation, toxins (like alcohol), or viruses, ALT leaks into the blood. It is deeply correlated with Non-Alcoholic Fatty Liver Disease (NAFLD) and metabolic strain."
  },
  ast: {
    short_description: "A liver and muscle enzyme; used alongside ALT for distress signs.",
    detailed_info: "Aspartate aminotransferase (AST) is an enzyme present in the liver, heart, and skeletal muscle. Because intense lifting can spike AST for days through muscle breakdown, it must be contextualized. A high AST to ALT ratio can sometimes indicate alcohol-related or advanced liver disease."
  },

  // === MICRONUTRIENTS ===
  vitamin_d: {
    short_description: "A pro-hormone crucial for immunity, bones, and mood.",
    detailed_info: "Vitamin D is technically a steroid pro-hormone synthesized by sunlight on the skin. Every cell in the immune system has a Vitamin D receptor. Suboptimal levels are linked to frequent illnesses, low mood, poor bone density, and impaired testosterone production. Supplementation in winter is almost universally required."
  },
  magnesium_rbc: {
    short_description: "Accurate measurement of magnesium stored directly inside cells.",
    detailed_info: "Serum magnesium is practically useless because the body will steal from bones and cells to keep blood levels tightly regulated. Red Blood Cell (RBC) Magnesium is a far more accurate gauge of your actual functional magnesium stores, which is vital for sleep quality, 300+ enzymatic reactions, and muscle relaxation."
  },
  vitamin_b12: {
    short_description: "Essential for nerve function and red blood cell production.",
    detailed_info: "Vitamin B12 is vital for DNA synthesis, myelination of nerves, and brain health. Because it is exclusively found in animal products, vegans must supplement. Marginal B12 deficiency leads to lethargy, brain fog, and numbness. The standard reference range is often viewed as too low by functional practitioners."
  }
};

export function getTestInfo(testName: string): Omit<TestInfo, "test_name"> {
    const key = testName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (TEST_INFO_DATABASE[key]) {
        return TEST_INFO_DATABASE[key];
    }
    
    return {
        short_description: "Description not available.",
        detailed_info: "Detailed educational information hasn't been written for this test yet. Check back periodically as the local encyclopedia expands!"
    };
}
