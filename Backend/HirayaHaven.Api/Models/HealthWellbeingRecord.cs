namespace HirayaHaven.Api.Models;

public class HealthWellbeingRecord
{
    public int HealthRecordId { get; set; }
    public int ResidentId { get; set; }
    public string? RecordDate { get; set; }
    public double? GeneralHealthScore { get; set; }
    public double? NutritionScore { get; set; }
    public double? SleepQualityScore { get; set; }
    public double? EnergyLevelScore { get; set; }
    public double? HeightCm { get; set; }
    public double? WeightKg { get; set; }
    public double? Bmi { get; set; }
    public bool? MedicalCheckupDone { get; set; }
    public bool? DentalCheckupDone { get; set; }
    public bool? PsychologicalCheckupDone { get; set; }
    public string? Notes { get; set; }

    public Resident? Resident { get; set; }
}
