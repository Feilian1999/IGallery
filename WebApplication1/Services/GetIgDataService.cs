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
                var token = "IGQVJWQWdWY1NwQks0VWlxVkpMeFhXaWxnR0RqMUhlQlkxOE1MdnF6MnpPTU5vbnAtVkloOUpqd1hjNmI0VnA3OTRQdzFPVmcxd0NOZA09PbGp3cEhsUkZAhS05wR2M3MkNYc0F1OWN3";
                string url = $"/me/media?fields={fields}&access_token={token}";

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
