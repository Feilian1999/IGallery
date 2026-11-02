using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.IO;
using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Linq;
using Microsoft.Extensions.Options;
using WebApplication1.Helpers;
using WebApplication1.Models;
using static System.Net.WebRequestMethods;

namespace WebApplication1.Services
{
    public class GetTokenService : IGetTokenService
    {
        private readonly InstagramOptions _instagram;

        public GetTokenService(IOptions<InstagramOptions> instagram)
        {
            _instagram = instagram.Value;
        }

        public async Task<GetTokenRs> GetToken(string oauthToken)
        {

            var formContent = new FormUrlEncodedContent(
                new Dictionary<string, string> {
                    { "client_id", _instagram.ClientId ?? "" },
                    { "client_secret", _instagram.ClientSecret ?? "" },
                    { "grant_type", "authorization_code" },
                    { "redirect_uri", _instagram.RedirectUri ?? "" },
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
