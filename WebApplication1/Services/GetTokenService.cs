using Newtonsoft.Json;
using System;
using System.IO;
using System.Text.Json.Serialization;
using WebApplication1.Models;
using static System.Net.WebRequestMethods;

namespace WebApplication1.Services
{
    public class GetTokenservice : IGetTokenService
    {
        public async Task<GetTokenRs> GetToken(string oauthToken)
        {
            var GetTokenRq = new GetTokenRq()
            {
                ClientId = "226106916475206",
                ClientSecret = "23a689c6abea0de7774b2c7d4e1a1609",
                GrantType = "authorization_code",
                RedirectUri = "https://zx123497.github.io/IGallery/",
                Code = oauthToken
            };
            string request = JsonConvert.SerializeObject(GetTokenRq);
            StringContent rq = new StringContent(request);
            HttpClient client = new HttpClient() {BaseAddress = new Uri("https://api.instagram.com") };
            
            var response = await client.PostAsync("/oauth/access_token", rq);
            var rs = new GetTokenRs();
            var content = response.Content.ReadAsStringAsync().Result;
            if (content != null) { 
                rs = JsonConvert.DeserializeObject(content) as GetTokenRs;
            }
            return rs;    
        }
    }
}
