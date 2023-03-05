using System;
using WebApplication1.Models;
namespace WebApplication1.Services
{
    public interface IGetTokenService
    {
        public Task<GetTokenRs> GetToken(string oauthToken);
    }
}
