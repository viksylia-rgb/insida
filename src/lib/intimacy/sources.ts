import type { Source } from "./types";

/**
 * Научные источники отчёта. Указаны только публикации с проверяемыми выходными данными.
 * DOI приведены там, где они есть у публикации; у книг и глав в сборниках DOI нет.
 */
export const SOURCES: Source[] = [
  // Привязанность
  { id: "bowlby1969", cite: "Bowlby, J. (1969). Attachment and loss: Vol. 1. Attachment. Basic Books." },
  { id: "hazan1987", cite: "Hazan, C., & Shaver, P. (1987). Romantic love conceptualized as an attachment process. Journal of Personality and Social Psychology, 52(3), 511–524.", url: "https://doi.org/10.1037/0022-3514.52.3.511" },
  { id: "fraley2000", cite: "Fraley, R. C., & Shaver, P. R. (2000). Adult romantic attachment: Theoretical developments, emerging controversies, and unanswered questions. Review of General Psychology, 4(2), 132–154.", url: "https://doi.org/10.1037/1089-2680.4.2.132" },
  { id: "mikulincer2016", cite: "Mikulincer, M., & Shaver, P. R. (2016). Attachment in adulthood: Structure, dynamics, and change (2nd ed.). Guilford Press." },
  { id: "feeney2004", cite: "Feeney, B. C. (2004). A secure base: Responsive support of goal strivings and exploration in adult intimate relationships. Journal of Personality and Social Psychology, 87(5), 631–648.", url: "https://doi.org/10.1037/0022-3514.87.5.631" },

  // Близость, самораскрытие, отзывчивость
  { id: "reis1988", cite: "Reis, H. T., & Shaver, P. (1988). Intimacy as an interpersonal process. In S. Duck (Ed.), Handbook of personal relationships (pp. 367–389). Wiley." },
  { id: "laurenceau1998", cite: "Laurenceau, J.-P., Barrett, L. F., & Pietromonaco, P. R. (1998). Intimacy as an interpersonal process: The importance of self-disclosure, partner disclosure, and perceived partner responsiveness in interpersonal exchanges. Journal of Personality and Social Psychology, 74(5), 1238–1251.", url: "https://doi.org/10.1037/0022-3514.74.5.1238" },
  { id: "reis2004", cite: "Reis, H. T., Clark, M. S., & Holmes, J. G. (2004). Perceived partner responsiveness as an organizing construct in the study of intimacy and closeness. In D. J. Mashek & A. Aron (Eds.), Handbook of closeness and intimacy (pp. 201–225). Lawrence Erlbaum." },
  { id: "collins1994", cite: "Collins, N. L., & Miller, L. C. (1994). Self-disclosure and liking: A meta-analytic review. Psychological Bulletin, 116(3), 457–475.", url: "https://doi.org/10.1037/0033-2909.116.3.457" },
  { id: "aron1997", cite: "Aron, A., Melinat, E., Aron, E. N., Vallone, R. D., & Bator, R. J. (1997). The experimental generation of interpersonal closeness: A procedure and some preliminary findings. Personality and Social Psychology Bulletin, 23(4), 363–377.", url: "https://doi.org/10.1177/0146167297234003" },
  { id: "gable2004", cite: "Gable, S. L., Reis, H. T., Impett, E. A., & Asher, E. R. (2004). What do you do when things go right? The intrapersonal and interpersonal benefits of sharing positive events. Journal of Personality and Social Psychology, 87(2), 228–245.", url: "https://doi.org/10.1037/0022-3514.87.2.228" },

  // Поддержка
  { id: "bolger2000", cite: "Bolger, N., Zuckerman, A., & Kessler, R. C. (2000). Invisible support and adjustment to stress. Journal of Personality and Social Psychology, 79(6), 953–961.", url: "https://doi.org/10.1037/0022-3514.79.6.953" },
  { id: "maisel2009", cite: "Maisel, N. C., & Gable, S. L. (2009). The paradox of received social support: The importance of responsiveness. Psychological Science, 20(8), 928–932.", url: "https://doi.org/10.1111/j.1467-9280.2009.02388.x" },
  { id: "feeney2015", cite: "Feeney, B. C., & Collins, N. L. (2015). A new look at social support: A theoretical perspective on thriving through relationships. Personality and Social Psychology Review, 19(2), 113–147.", url: "https://doi.org/10.1177/1088868314544222" },

  // Эмоциональная регуляция и совместная регуляция
  { id: "gross1998", cite: "Gross, J. J. (1998). The emerging field of emotion regulation: An integrative review. Review of General Psychology, 2(3), 271–299.", url: "https://doi.org/10.1037/1089-2680.2.3.271" },
  { id: "lieberman2007", cite: "Lieberman, M. D., Eisenberger, N. I., Crockett, M. J., Tom, S. M., Pfeifer, J. H., & Way, B. M. (2007). Putting feelings into words: Affect labeling disrupts amygdala activity in response to affective stimuli. Psychological Science, 18(5), 421–428.", url: "https://doi.org/10.1111/j.1467-9280.2007.01916.x" },
  { id: "coan2006", cite: "Coan, J. A., Schaefer, H. S., & Davidson, R. J. (2006). Lending a hand: Social regulation of the neural response to threat. Psychological Science, 17(12), 1032–1039.", url: "https://doi.org/10.1111/j.1467-9280.2006.01832.x" },
  { id: "sbarra2008", cite: "Sbarra, D. A., & Hazan, C. (2008). Coregulation, dysregulation, self-regulation: An integrative analysis and empirical agenda for understanding adult attachment, separation, loss, and recovery. Personality and Social Psychology Review, 12(2), 141–167.", url: "https://doi.org/10.1177/1088868308315702" },
  { id: "butler2013", cite: "Butler, E. A., & Randall, A. K. (2013). Emotional coregulation in close relationships. Emotion Review, 5(2), 202–210.", url: "https://doi.org/10.1177/1754073912451630" },
  { id: "zaki2013", cite: "Zaki, J., & Williams, W. C. (2013). Interpersonal emotion regulation. Emotion, 13(5), 803–810.", url: "https://doi.org/10.1037/a0033839" },

  // EFT
  { id: "johnson2004", cite: "Johnson, S. M. (2004). The practice of emotionally focused couple therapy: Creating connection (2nd ed.). Brunner-Routledge." },
  { id: "johnson2008", cite: "Johnson, S. (2008). Hold me tight: Seven conversations for a lifetime of love. Little, Brown." },
  { id: "wiebe2016", cite: "Wiebe, S. A., & Johnson, S. M. (2016). A review of the research in emotionally focused therapy for couples. Family Process, 55(3), 390–407.", url: "https://doi.org/10.1111/famp.12229" },

  // Готтман и конфликт
  { id: "gottman1992", cite: "Gottman, J. M., & Levenson, R. W. (1992). Marital processes predictive of later dissolution: Behavior, physiology, and health. Journal of Personality and Social Psychology, 63(2), 221–233.", url: "https://doi.org/10.1037/0022-3514.63.2.221" },
  { id: "gottman1998", cite: "Gottman, J. M., Coan, J., Carrere, S., & Swanson, C. (1998). Predicting marital happiness and stability from newlywed interactions. Journal of Marriage and the Family, 60(1), 5–22.", url: "https://doi.org/10.2307/353438" },
  { id: "driver2004", cite: "Driver, J. L., & Gottman, J. M. (2004). Daily marital interactions and positive affect during marital conflict among newlywed couples. Family Process, 43(3), 301–314.", url: "https://doi.org/10.1111/j.1545-5300.2004.00024.x" },
  { id: "gottman1999", cite: "Gottman, J. M., & Silver, N. (1999). The seven principles for making marriage work. Crown." },
  { id: "christensen1990", cite: "Christensen, A., & Heavey, C. L. (1990). Gender and social structure in the demand/withdraw pattern of marital conflict. Journal of Personality and Social Psychology, 59(1), 73–81.", url: "https://doi.org/10.1037/0022-3514.59.1.73" },
  { id: "overall2017", cite: "Overall, N. C., & McNulty, J. K. (2017). What type of communication during conflict is beneficial for intimate relationships? Current Opinion in Psychology, 13, 1–5.", url: "https://doi.org/10.1016/j.copsyc.2016.03.002" },

  // Благодарность
  { id: "algoe2012", cite: "Algoe, S. B. (2012). Find, remind, and bind: The functions of gratitude in everyday relationships. Social and Personality Psychology Compass, 6(6), 455–469.", url: "https://doi.org/10.1111/j.1751-9004.2012.00439.x" },

  // Измерение удовлетворённости и методология
  { id: "fletcher2000", cite: "Fletcher, G. J. O., Simpson, J. A., & Thomas, G. (2000). The measurement of perceived relationship quality components: A confirmatory factor analytic approach. Personality and Social Psychology Bulletin, 26(3), 340–354.", url: "https://doi.org/10.1177/0146167200265007" },
  { id: "funk2007", cite: "Funk, J. L., & Rogge, R. D. (2007). Testing the ruler with item response theory: Increasing precision of measurement for relationship satisfaction with the Couples Satisfaction Index. Journal of Family Psychology, 21(4), 572–583.", url: "https://doi.org/10.1037/0893-3200.21.4.572" },
  { id: "clark1995", cite: "Clark, L. A., & Watson, D. (1995). Constructing validity: Basic issues in objective scale development. Psychological Assessment, 7(3), 309–319.", url: "https://doi.org/10.1037/1040-3590.7.3.309" },
];

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id);
