using System;
using System.Collections.Generic;

namespace WebApplication1.Models;

public partial class Token
{
    public int TokenId { get; set; }

    public string? AccessToken { get; set; }

    public DateTime? CreateTime { get; set; }

    public DateTime? UpdateTime { get; set; }

    public DateTime? ExpireTime { get; set; }

    public int? ArtistId { get; set; }

    public virtual Artist? Artist { get; set; }
}
