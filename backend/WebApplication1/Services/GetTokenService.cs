using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.IO;
using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Linq;
using WebApplication1.Models;
using static System.Net.WebRequestMethods;

namespace WebApplication1.Services
{
    public class GetTokenService : IGetTokenService
    {
        public async Task<GetTokenRs> GetToken(string oauthToken)
        {

            var formContent = new FormUrlEncodedContent(
                new Dictionary<string, string> {
                    { "client_id", "226106916475206" },
                    { "client_secret", "23a689c6abea0de7774b2c7d4e1a1609" },
                    { "grant_type", "authorization_code" },
                    { "redirect_uri", "https://zx123497.github.io/IGallery/" },
                    { "code", oauthToken}
                });
            using (var client = new HttpClient() { BaseAddress = new Uri("https://api.instagram.com") })
            {
                var response = await client.PostAsync("/oauth/access_token", formContent);
                var content = response.Content.ReadAsStringAsync().Result;
                if (content != null)
                {
                    var rs = JsonConvert.DeserializeObject<GetTokenRs>(content);
                    return rs;
                }
                return new GetTokenRs();
            }
            
            
               
        }

        public async Task<ExtendTokenRs> ExtendToken(string accessToken)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                string url = $"/access_token?grant_type=ig_exchange_token&client_secret=23a689c6abea0de7774b2c7d4e1a1609&access_token={accessToken}";

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
