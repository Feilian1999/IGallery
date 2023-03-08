﻿using Newtonsoft.Json;
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
                var token = "IGQVJVeWxsSW9QX1cwMWtEOWZAWOFA0ZAURFcjk4VDdIYWF0VW9HYXFTc2VoYm9ocnRHRG83VmRKbWJ1YlpqcnIzTUdYYTN0VFh3SXZAZAaUR1TWk3X3VKa3pydEdIYmJsMHlocUZAXNFFFNVpHY3pRU2FkWW5YdU41SVRKSHQw";
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
