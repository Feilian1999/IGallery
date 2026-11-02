using WebApplication1.Models;

namespace WebApplication1.Services
{
    public interface IExtendTokenService
    {
        /// <summary>
        /// 延長Token至60天
        /// </summary>
        /// <param name="accessToken">短期的一小時版Token</param>
        /// <returns> IExtendToken Object</returns>
        public Task<ExtendTokenRs> ExtendTokenRs(string accessToken); 
    }
}
