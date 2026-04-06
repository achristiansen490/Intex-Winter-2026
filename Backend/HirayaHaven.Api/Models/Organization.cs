namespace HirayaHaven.Api.Models;

public class Organization
{
    public int OrgId { get; set; }
    public string? OrgName { get; set; }
    public string? LegalName { get; set; }
    public string? OrgType { get; set; }
    public string? Ein { get; set; }
    public string? CountryOfRegistration { get; set; }
    public string? OperationsCountry { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? LogoUrl { get; set; }
    public string? MissionStatement { get; set; }
    public int? FoundedYear { get; set; }
    public string? FiscalYearStart { get; set; }
    public string? FiscalYearEnd { get; set; }
    public string? CurrencyPrimary { get; set; }
    public string? CurrencyReporting { get; set; }
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }
}
