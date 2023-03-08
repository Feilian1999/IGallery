using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using WebApplication1.Models;
namespace WebApplication1.Services
{
	public class GetIgDataService : IGetIgDataService
	{
		public async Task<IgData> GetIgData()
		{
            using (var client = new HttpClient { BaseAddress = new Uri("https://graph.instagram.com") })
            {
                var fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username";
                var token = "IGQVJYRklMaHBLeWMyY1IzZAC0waGF6Q1Q1UVNEZAXpLeVgzSUg5V0N5SXU5MTZAUM092cmVQR2VlVENPZAVRyaGw1YTNZAR3IwdkZAMdWU5RUZAvWGJTRVlpaDY0SFdGcHdwRUFuMVlXbWg5VVVLX1NFQkd4QnVzS1habUVya3Bj";
                var extToken = "IGQVJYdDh1cXh6TjlWZAVdpWG1ya21LSUpRWWg1VHNqaUQ1Qzl5cXJGVzJVWGdLVTFGT2FYWjVsOURGT3BBNHlhd1ZAPMHU1VnJjb09PaXREQUwtMkJkS3ZAmYmxVcDlnZAHdRZAmNSTnF3";
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
	}
}
