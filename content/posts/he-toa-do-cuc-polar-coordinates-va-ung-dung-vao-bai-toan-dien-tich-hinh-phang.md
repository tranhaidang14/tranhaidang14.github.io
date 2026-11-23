---
title: "Hệ tọa độ cực(Polar Coordinates) và ứng dụng vào bài toán diện tích hình phẳng"
date: 2026-11-21
category: "Giải tích"
tags: ["Hình học giải tích", "Nguyên hàm - tích phân"]
summary: "Đây là một dạng kiến thức khá đặc thù mà chỉ áp dụng được cho một số bài đặc biệt. Tuy nhiên, nếu thành thạo nó sẽ là một công cụ đắc lực giảm đi nhiều phần sai xót cho những bài toán tưởng chừng phức tạp."
featured: false
draft: true
---
<div class="note">
<p class="note__title">Kiến thức cần biết</p>
<ul>
	<li>Lượng giác</li>
	<li>Hình học giải tích và hệ trục tọa độ chữ nhật(Descartes)</li>
	<li> Nguyên hàm tích phân</li>
</ul>
</div>

![Bài toán mở đầu - lấy từ sách Hành trình chinh phục Tập 2 của thầy Đỗ Văn Đức](content/library/photos/21.jpg)

Trong lúc làm bài tập, tôi đã bắt gặp bài một toán thú vị. Ấn tượng đầu tiên khi đặt bút giải là: hệ tọa độ cực. Lí do rất đơn giản: tôi muốn tô màu. Quan sát tia OM cùng tính đối xứng hình học của bài, trực giác bảo tôi rằng nó xoay một vòng và quét ra hình phẳng trên. Theo quan điểm của tôi, đó là cốt lõi của hệ tọa độ cực: phép xoay. 

Tuy nhiên, việc biết đến và thật sự vận dụng được hệ tọa độ cực là khác nhau. Vì thế mà bài viết này ra đời, và mục tiêu cuối cùng mà nó muốn đạt được chính là đưa ra một lời giải đẹp cho bài toán trên.

## Hệ tọa độ cực
Một cách tổng quát, một hệ trục tọa độ thực hiện duy nhất một nhiệm vụ: xác định vị trí của một điểm bằng các quan hệ của điểm tới các trục. Ví dụ như trong hệ Descartes, ta xác định một điểm bằng đường để đi đến nó theo hai tia Ox và Oy. Còn với hệ tọa độ cực, ta xác định điểm bằng độ dài và một phép xoay.

Gần gũi nhất, bạn đọc hẳn đã biết về đường tròn lượng giác: Một đường tròn bán kính bằng 1, tâm nằm tại gốc tọa độ trong hệ Oxy và một điểm A là giao điểm của đường tròn với tia Ox.

![Đường tròn lượng giác](content/library/photos/ĐTLG.jpg)

Giả dụ như OA không còn bằng 1 nữa, ta xét đến một đường tròn tổng quát bán kính OA.

Xét điểm M(x, y) nằm trên đường tròn như hình vẽ. Ta có được $OM = OA$. Đặt $\alpha=\angle{AOM}$

Vận dụng các công thức lượng trong tam giác OAM với góc $\alpha$, ta có thể xác định tọa độ điểm M theo OM như sau:
$$
\begin{align}
\begin{cases}
x = OM\cos\alpha \\
y = OM\sin\alpha
\end{cases}
\end{align}
$$
Nói cách khác, ta xác định được điểm M trên đường tròn bằng độ dài bán kính và số đo góc OM với đường chuẩn.

Đó cũng là phương pháp mà hệ tọa độ cực sử dụng: góc và bán kính. Về cơ bản, nếu coi thứ ẩn sau hệ Descartes là những lưới vuông, nền tảng của hệ tọa độ cực là vô hạn những đường tròn đồng tâm.

<div class="note">
<p class="note__title">Hệ tọa độ cực</p>
<p><strong>Hệ tọa độ cực</strong> là hệ trục tọa độ trong mặt phẳng, bao gồm một tâm O và một tia Ox, trong đó một điểm M được xác định bằng khoảng cách $r = OM$ và góc $\alpha=\angle{xOM}$, hay: M(r; $\alpha$)</p>
</div>

![Hệ tọa độ cực](content/library/photos/polar_graph.png)

## Một số vấn đề nền tảng với hệ tọa độ cực
### a. Chuyển đổi giữa hệ chữ nhật và hệ cực.
Xét điểm $M(r; \theta)$ trong hệ tọa độ cực. Để tìm được tọa độ M(x; y) tương ứng trong hệ Descartes, ta đơn giản là vẽ một đường tròn tâm O bán kính r và làm ngược lại quá trình suy ra công thức (1).

<div class="note">
<p class="note__title">Công thức chuyển đổi giữa hệ Descartes và hệ tọa độ cực</p>
<p>Xét điểm $M(r;\theta)$ trong hệ tọa độ cực, tọa độ tương ứng $M(x;y)$ của điểm đó trong hệ Descartes là:
$$
		\begin{cases}
			x = r\cos\theta \\
			y = r\sin\theta
		\end{cases}$$
</p>
</div>

### b. Đường tròn tâm cực, đường thẳng qua cực

![Đường thẳng qua tâm](content/library/photos/Đthquatam.jpg)

<div class="note">
<p class="note__title">Đường thẳng qua cực</p>
<p>$$\theta = a$$ với a là hệ số góc của đường thẳng</p>
</div>
<div class="note">
<p class="note__title">Đường tròn tâm cực</p>
<p>$$r = R$$ với R là bán kính đường tròn</p>
</div>

Ngắn gọn thật nhỉ? Đúng vậy, tuy nhiên đường tròn và đường thẳng **không** qua tâm lại là một câu chuyện khác. Tuy nhiên, để giữ bài viết không lan man, tôi sẽ tránh giới thiệu và chứng minh chúng ở đây, thay vào đó, bạn đó có thể xem qua <a href="https://vi.wikipedia.org/wiki/H%E1%BB%87_t%E1%BB%8Da_%C4%91%E1%BB%99_c%E1%BB%B1c">Wikipedia</a>.

### c. Tích phân trong hệ cực
<div class="note">
<p class="note__title">Diện tích hình phẳng trong hệ cực</p>
<p>$$
S = \int_a^b{\frac{1}{2}f^2(\theta)}d\theta
$$

với S là diện tích hình được giới hạn bởi hai đường thẳng qua tâm $\theta = a, \theta = b$ và đồ thị hàm số $r = f(\theta)$.</p>

</div>
Để hiểu một cách trực giác công thức này, bạn đọc hãy xem qua ví dụ sau:

Ta đã biết, công thức tính diện tích của một hình quạt tròn là $S = \frac{1}{2}r^2\theta$ . Với $r$ là bán kính, $\theta$ là số đo góc cung tròn tương ứng.

Bây giờ, ta áp dụng cách tư duy tương tự như khái niệm tích phân đã biết: chia hình thành rất nhiều phần nhỏ. Trong hệ tọa độ Descartes, tích phân là tổng của rất nhiều **hình chữ nhật** nhỏ; còn trong hệ tọa độ cực, tích phân là tổng của vô số **quạt tròn** nhỏ, quét từ tia này sang tia khác.
![Cung tròn vi phân](content/library/photos/Cungtron.png)
Nếu diện tích mỗi hình chữ nhật nhỏ là $f(x)dx$, tức chiều cao nhân chiều rộng, thì diện tích mỗi quạt tròn nhỏ tương ứng là $$\frac{1}{2}f^2(\theta)d\theta$$

## Lời giải bài toán mở đầu
![Bài toán mở đầu - lấy từ sách Hành trình chinh phục Tập 2 của thầy Đỗ Văn Đức](content/library/photos/21.jpg)

Đặt hình vào hệ tọa độ cực:

![Hình vẽ](content/library/photos/BTMD.jpg)