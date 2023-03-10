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
                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = await response.Content.ReadAsStringAsync();
                var rs = JsonConvert.DeserializeObject<IgData>(responseContent);
                return rs ?? throw new ArgumentNullException(nameof(rs));
            }
        }
        public async Task<PostInAlbum> GetAlbumPost(string postId, string token)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                var fields = "id,media_type,media_url,permalink,thumbnail_url,timestamp,username";
                string url = $"/{postId}?fields={fields}&access_token={token}";
                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = await response.Content.ReadAsStringAsync();
                var rs = JsonConvert.DeserializeObject<PostInAlbum>(responseContent);
                return rs ?? throw new ArgumentNullException(nameof(rs));
            }
        }

        public async Task<AlbumData> GetAlbumData(string albumId, string token)
        {
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                string url = $"/{albumId}/children?access_token={token}";
                HttpResponseMessage response = await client.GetAsync(url);
                var responseContent = await response.Content.ReadAsStringAsync();
                var rs = JsonConvert.DeserializeObject<AlbumData>(responseContent);
                return rs ?? throw new ArgumentNullException(nameof(rs));
            }
        }

        /// <summary>
        /// 取得測試用token
        /// </summary>
        /// <returns>token string</returns>
        private string _getToken()
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
