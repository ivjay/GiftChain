export function truncateAddress(addr: string): string {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(iso);
}

export function explorerUrl(hash: string, type: 'address' | 'tx' = 'tx'): string {
    return `https://amoy.polygonscan.com/${type}/${hash}`;
}

export function categoryEmoji(cat: string): string {
    const map: Record<string, string> = {
        streaming: '🎬', gaming: '🎮', food: '🍔', travel: '✈️',
        shopping: '📦', music: '🎵', education: '📚', fitness: '🏋️',
    };
    return map[cat] || '🎁';
}

export function categoryLabel(cat: string): string {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function statusColor(status: string): string {
    switch (status) {
        case 'active': return 'text-green-400';
        case 'redeemed': return 'text-gray-400';
        case 'listed': return 'text-accent';
        case 'confirmed': return 'text-green-400';
        case 'pending': return 'text-yellow-400';
        case 'failed': return 'text-red-400';
        default: return 'text-text-muted';
    }
}

export function statusBadgeColor(status: string): string {
    switch (status) {
        case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'redeemed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        case 'listed': return 'bg-accent/20 text-accent border-accent/30';
        case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}

export function severityColor(severity: string): string {
    switch (severity) {
        case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/40';
        case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
        case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
        case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
}

export async function encryptData(data: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(key.padEnd(32, '0').slice(0, 32)), 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyMaterial, encoder.encode(data));
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    // Convert to base64 safely (chunk-based — avoids stack overflow on large arrays)
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
}

export async function decryptData(encryptedB64: string, key: string): Promise<string> {
    const binaryStr = atob(encryptedB64);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        combined[i] = binaryStr.charCodeAt(i);
    }
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(key.padEnd(32, '0').slice(0, 32)), 'AES-GCM', false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data);
    return new TextDecoder().decode(decrypted);
}

export function generateReceiptPDF(receipt: import('../types').Receipt): void {
    import('jspdf').then(({ jsPDF }) => {
        const doc = new jsPDF();
        const purple = [108, 92, 231] as const;
        const gold = [246, 185, 59] as const;
        // Header
        doc.setFillColor(...purple);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('GiftChain', 20, 22);
        doc.setFontSize(10);
        doc.text('AI-Powered NFT Gift Marketplace', 20, 32);
        // Receipt type badge
        doc.setFillColor(...gold);
        doc.roundedRect(140, 12, 50, 16, 3, 3, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(receipt.type.toUpperCase(), 165, 22, { align: 'center' });
        // Body
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(16);
        doc.text('Transaction Receipt', 20, 55);
        doc.setFontSize(10);
        const fields = [
            ['Receipt ID', receipt.id],
            ['Type', receipt.type],
            ['Gift', receipt.giftTitle],
            ['Token ID', `#${receipt.tokenId}`],
            ['Transaction Hash', receipt.txHash],
            ['Wallet', receipt.userWallet],
            ['Amount', receipt.amount || 'N/A'],
            ['Platform Fee', receipt.fee || 'N/A'],
            ['Counterparty', receipt.counterparty || 'N/A'],
            ['Status', receipt.status],
            ['Date', formatDateTime(receipt.timestamp)],
        ];
        let y = 70;
        fields.forEach(([label, value]) => {
            doc.setTextColor(120, 120, 140);
            doc.text(label, 20, y);
            doc.setTextColor(40, 40, 60);
            const displayVal = String(value).length > 50 ? String(value).slice(0, 50) + '...' : String(value);
            doc.text(displayVal, 70, y);
            y += 8;
        });
        // Footer
        doc.setDrawColor(...purple);
        doc.line(20, y + 5, 190, y + 5);
        doc.setTextColor(150, 150, 170);
        doc.setFontSize(8);
        doc.text('This receipt was generated by GiftChain. Verify on Polygon Amoy Scan.', 20, y + 12);
        doc.text(`Generated: ${new Date().toISOString()}`, 20, y + 18);
        doc.save(`giftchain-receipt-${receipt.id}.pdf`);
    });
}
/**
 * Robust copy to clipboard with fallback for non-secure contexts
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure localhost/HTTP
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error("Copy failed", err);
    return false;
  }
}
export function isImageUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http') || url.startsWith('ipfs://') || url.startsWith('data:image');
}

export function formatImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
        const cid = url.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${cid}`;
    }
    return url;
}
