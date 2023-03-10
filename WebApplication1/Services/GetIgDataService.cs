using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using WebApplication1.Models;
namespace WebApplication1.Services
{
    public class GetIgDataService : IGetIgDataService
    {
        public async Task<IgData> GetIgData(string token)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                var fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username";
                string url = $"/me/media?fields={fields}&access_token={token}";
                //client.DefaultRequestHeaders.Add("Authentication", "Bearer " + extToken);
                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = response.Content.ReadAsStringAsync().Result;
                if (responseContent != null)
                {
                    var rs = JsonConvert.DeserializeObject<IgData>(responseContent);
                    return rs;
                }
            }
            return new IgData();
        }
        public async Task<PostInAlbum> GetAlbumPost(string postId)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                var fields = "id,media_type,media_url,permalink,thumbnail_url,timestamp,username";
                var token = getToken();
                string url = $"/{postId}?fields={fields}&access_token={token}";
                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = response.Content.ReadAsStringAsync().Result;
                if (responseContent != null)
                {
                    var rs = JsonConvert.DeserializeObject<PostInAlbum>(responseContent);
                    return rs;
                }
            }
            return new PostInAlbum();
        }

        public async Task<AlbumData> GetAlbumData(string albumId)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                var token = getToken();
                string url = $"/{albumId}/children?access_token={token}";
                //client.DefaultRequestHeaders.Add("Authentication", "Bearer " + extToken);
                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = response.Content.ReadAsStringAsync().Result;
                if (responseContent != null)
                {
                    var rs = JsonConvert.DeserializeObject<AlbumData>(responseContent);
                    return rs;
                }
            }
            return new AlbumData();
        }

        private string getToken()
        {
            var builder = new ConfigurationBuilder()
              .SetBasePath(Directory.GetCurrentDirectory())
              .AddJsonFile("appsettings.json");
            var config = builder.Build();
            if (config["Token:access_token"] != null) {
                return config["Token:access_token"];
            }
            return "0";
        }
    }
}
