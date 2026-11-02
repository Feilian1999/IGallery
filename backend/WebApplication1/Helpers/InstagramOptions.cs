using System;
namespace WebApplication1.Helpers
{
	// Instagram app credentials, bound from the "Instagram" configuration section.
	public class InstagramOptions
	{
		public string? ClientId { get; set; }
		public string? ClientSecret { get; set; }
		public string? RedirectUri { get; set; }
	}
}
