using Newtonsoft.Json;
using Microsoft.Extensions.Options;
using System.Reflection.Metadata.Ecma335;
using WebApplication1.Helpers;
using WebApplication1.Models;

namespace WebApplication1.Services
{
    public class ExtendTokenService: IExtendTokenService
    {
        private readonly InstagramOptions _instagram;

        public ExtendTokenService(IOptions<InstagramOptions> instagram)
        {
            _instagram = instagram.Value;
        }

        public async Task<ExtendTokenRs> ExtendTokenRs(string accessToken)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                string url = $"/access_token?grant_type=ig_exchange_token&client_secret={_instagram.ClientSecret}&access_token={accessToken}";

                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = response.Content.ReadAsStringAsync().Result;
                if (responseContent != null)
                {
                    var rs = JsonConvert.DeserializeObject<ExtendTokenRs>(responseContent);
                    return rs;
                }
            }

            return new ExtendTokenRs();
        }
        
    }
}
