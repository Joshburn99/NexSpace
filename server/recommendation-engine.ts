import { storage } from "./storage";
import type { Facility } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RecommendationCriteria {
  location: {
    lat: number;
    lng: number;
  };
  facilityType?: string;
  maxDistance?: number; // in miles
  minRating?: number;
  requiresSpecialty?: string[];
  bedCountMin?: number;
  participatesMedicare?: boolean;
  participatesMedicaid?: boolean;
  prioritizeQuality?: boolean;
  prioritizeDistance?: boolean;
}

export interface FacilityRecommendation {
  facility: Facility;
  distance: number; // in miles
  score: number; // overall recommendation score (0-100)
  reasons: string[];
  qualityMetrics: {
    overallRating?: number;
    staffingScore?: number;
    qualityScore?: number;
    safetyScore?: number;
  };
  travelInfo?: {
    estimatedTravelTime: string;
    directions?: string;
  };
}

export class LocationBasedRecommendationEngine {
  constructor() {}

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate quality score based on facility ratings
   */
  private calculateQualityScore(facility: Facility): number {
    let score = 0;
    let factors = 0;

    if (facility.overallRating) {
      score += (facility.overallRating / 5) * 30;
      factors += 30;
    }

    if (facility.staffingRating) {
      score += (facility.staffingRating / 5) * 25;
      factors += 25;
    }

    if (facility.qualityMeasureRating) {
      score += (facility.qualityMeasureRating / 5) * 25;
      factors += 25;
    }

    if (facility.healthInspectionRating) {
      score += (facility.healthInspectionRating / 5) * 20;
      factors += 20;
    }

    return factors > 0 ? score : 50; // Default to 50 if no ratings available
  }

  /**
   * Calculate recommendation score based on multiple factors
   */
  private calculateRecommendationScore(
    facility: Facility,
    distance: number,
    criteria: RecommendationCriteria
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const maxDistance = criteria.maxDistance || 50;

    // Distance score (closer is better)
    const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
    const distanceWeight = criteria.prioritizeDistance ? 0.4 : 0.3;
    score += distanceScore * distanceWeight;

    if (distance <= 5) {
      reasons.push("Very close to your location");
    } else if (distance <= 15) {
      reasons.push("Convenient distance");
    }

    // Quality score
    const qualityScore = this.calculateQualityScore(facility);
    const qualityWeight = criteria.prioritizeQuality ? 0.4 : 0.3;
    score += qualityScore * qualityWeight;

    if (facility.overallRating && facility.overallRating >= 4) {
      reasons.push("High overall rating");
    }

    if (facility.staffingRating && facility.staffingRating >= 4) {
      reasons.push("Excellent staffing ratings");
    }

    // Facility type match
    if (criteria.facilityType && facility.facilityType === criteria.facilityType) {
      score += 10;
      reasons.push("Matches requested facility type");
    }

    // Bed capacity
    if (criteria.bedCountMin && facility.bedCount && facility.bedCount >= criteria.bedCountMin) {
      score += 5;
      reasons.push("Meets capacity requirements");
    }

    // Insurance acceptance
    if (criteria.participatesMedicare && facility.participatesMedicare) {
      score += 5;
      reasons.push("Accepts Medicare");
    }

    if (criteria.participatesMedicaid && facility.participatesMedicaid) {
      score += 5;
      reasons.push("Accepts Medicaid");
    }

    // Safety factors
    if (facility.deficiencyCount !== null && facility.deficiencyCount === 0) {
      score += 10;
      reasons.push("No recent deficiencies");
    } else if (facility.deficiencyCount !== null && facility.deficiencyCount > 5) {
      score -= 10;
      reasons.push("Has recent deficiencies");
    }

    // Recent data
    if (facility.lastDataUpdate) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(facility.lastDataUpdate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate <= 30) {
        score += 5;
        reasons.push("Recently updated information");
      }
    }

    return { score: Math.min(100, Math.max(0, score)), reasons };
  }

  /**
   * Get estimated travel time using AI
   */
  private async getEstimatedTravelTime(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    distance: number
  ): Promise<string> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a travel time estimation expert. Based on distance and typical traffic patterns, provide a realistic travel time estimate.",
          },
          {
            role: "user",
            content: `Estimate travel time for a ${distance.toFixed(1)} mile trip in an urban/suburban healthcare context. Provide just the time estimate (e.g., "15-20 minutes").`,
          },
        ],
        max_tokens: 50,
      });

      return (
        response.choices[0].message.content?.trim() ||
        `${Math.round(distance * 2.5)}-${Math.round(distance * 3)} minutes`
      );
    } catch (error) {
      // Fallback calculation
      return `${Math.round(distance * 2.5)}-${Math.round(distance * 3)} minutes`;
    }
  }

  /**
   * Main recommendation function
   */
  async getRecommendations(criteria: RecommendationCriteria): Promise<FacilityRecommendation[]> {
    try {
      // Get all active facilities
      const allFacilities = await storage.getAllFacilities();

      // Filter and calculate recommendations
      const recommendations: FacilityRecommendation[] = [];

      for (const facility of allFacilities) {
        // Skip facilities without location data
        if (!facility.latitude || !facility.longitude) continue;

        const distance = this.calculateDistance(
          criteria.location.lat,
          criteria.location.lng,
          parseFloat(facility.latitude.toString()),
          parseFloat(facility.longitude.toString())
        );

        // Apply distance filter
        if (criteria.maxDistance && distance > criteria.maxDistance) continue;

        // Apply facility type filter
        if (criteria.facilityType && facility.facilityType !== criteria.facilityType) continue;

        // Apply minimum rating filter
        if (
          criteria.minRating &&
          (!facility.overallRating || facility.overallRating < criteria.minRating)
        )
          continue;

        // Apply bed count filter
        if (
          criteria.bedCountMin &&
          (!facility.bedCount || facility.bedCount < criteria.bedCountMin)
        )
          continue;

        // Calculate recommendation score
        const { score, reasons } = this.calculateRecommendationScore(facility, distance, criteria);

        // Get travel time estimate
        const travelTime = await this.getEstimatedTravelTime(
          criteria.location.lat,
          criteria.location.lng,
          parseFloat(facility.latitude.toString()),
          parseFloat(facility.longitude.toString()),
          distance
        );

        const recommendation: FacilityRecommendation = {
          facility,
          distance,
          score,
          reasons,
          qualityMetrics: {
            overallRating: facility.overallRating || undefined,
            staffingScore: facility.staffingRating || undefined,
            qualityScore: facility.qualityMeasureRating || undefined,
            safetyScore: facility.healthInspectionRating || undefined,
          },
          travelInfo: {
            estimatedTravelTime: travelTime,
          },
        };

        recommendations.push(recommendation);
      }

      // Sort by recommendation score (highest first)
      recommendations.sort((a, b) => b.score - a.score);

      // Return top 10 recommendations
      return recommendations.slice(0, 10);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw error;
    }
  }

  /**
   * Get recommendations for emergency situations (closest high-quality facilities)
   */
  async getEmergencyRecommendations(
    location: { lat: number; lng: number },
    facilityType: string = "hospital"
  ): Promise<FacilityRecommendation[]> {
    const criteria: RecommendationCriteria = {
      location,
      facilityType,
      maxDistance: 25,
      minRating: 3,
      prioritizeDistance: true,
    };

    const recommendations = await this.getRecommendations(criteria);

    // For emergency situations, prioritize the closest facilities
    return recommendations.sort((a, b) => a.distance - b.distance).slice(0, 5);
  }

  /**
   * Get specialized care recommendations
   */
  async getSpecializedCareRecommendations(
    location: { lat: number; lng: number },
    specialty: string,
    maxDistance: number = 50
  ): Promise<FacilityRecommendation[]> {
    const criteria: RecommendationCriteria = {
      location,
      maxDistance,
      minRating: 4,
      prioritizeQuality: true,
    };

    const recommendations = await this.getRecommendations(criteria);

    // Filter for facilities that might offer specialized care
    return recommendations.filter((rec) => {
      const facility = rec.facility;
      return facility.facilityType === "hospital" || (facility.bedCount && facility.bedCount > 100); // Larger facilities more likely to have specialties
    });
  }

  /**
   * Get insurance-specific recommendations
   */
  async getInsuranceBasedRecommendations(
    location: { lat: number; lng: number },
    insuranceType: "medicare" | "medicaid" | "both",
    facilityType?: string
  ): Promise<FacilityRecommendation[]> {
    const criteria: RecommendationCriteria = {
      location,
      facilityType,
      maxDistance: 30,
      participatesMedicare: insuranceType === "medicare" || insuranceType === "both",
      participatesMedicaid: insuranceType === "medicaid" || insuranceType === "both",
    };

    return this.getRecommendations(criteria);
  }
}

export const recommendationEngine = new LocationBasedRecommendationEngine();
