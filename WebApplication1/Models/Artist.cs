using System;
using System.Collections.Generic;

namespace WebApplication1.Models;

/// <summary>
/// Artists in IGallery
/// </summary>
public partial class Artist
{
    public int ArtistId { get; set; }

    public string? ArtistName { get; set; }

    public virtual ICollection<Token> Tokens { get; } = new List<Token>();
}
