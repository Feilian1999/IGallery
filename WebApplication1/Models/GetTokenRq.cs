using System;

namespace WebApplication1.Models
{
    public class GetTokenRq
    {
        public string? ClientId { get; set; }
        public string? ClientSecret { get; set; }
        public string? GrantType { get; set; }
        public string? RedirectUri { get; set; }
        public string? Code { get; set; }
    }

}
